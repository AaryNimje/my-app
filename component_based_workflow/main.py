import uuid
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import networkx as nx
from pydantic import BaseModel, Field
from fastapi import FastAPI, UploadFile, File
from contextlib import asynccontextmanager
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_mistralai import ChatMistralAI
from langchain_groq import ChatGroq
from langchain_community.document_loaders import PDFMinerLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain.chains import RetrievalQA
import os
import tempfile
import shutil
import time
import logging
from langchain_core.documents import Document

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Base Node Input/Output Models
class NodeInput(BaseModel):
    data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class NodeOutput(BaseModel):
    data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    success: bool = True
    error: Optional[str] = None


# Abstract Base Node
class BaseNode(ABC):
    def __init__(self, node_id: str, name: str):
        self.node_id = node_id
        self.name = name

    @abstractmethod
    def run(self, inputs: NodeInput) -> NodeOutput:
        pass

    @abstractmethod
    def validate_inputs(self, inputs: NodeInput) -> bool:
        pass


# LLM Node
class LLMNodeConfig(BaseModel):
    provider: str = Field(default="openai")
    model_name: str = Field(default="gpt-3.5-turbo")
    temperature: float = Field(default=0.7)
    max_tokens: int = Field(default=512)
    api_key: Optional[str] = Field(default=None)


class LLMNode(BaseNode):
    def __init__(self, node_id: str, name: str, config: LLMNodeConfig):
        super().__init__(node_id, name)
        self.config = config
        self.llm = self._initialize_llm()

    def _initialize_llm(self):
        providers = {
            "openai": ChatOpenAI,
            "google": ChatGoogleGenerativeAI,
            "mistral": ChatMistralAI,
            "groq": ChatGroq
        }
        provider_class = providers.get(self.config.provider)
        if not provider_class:
            raise ValueError(f"Unsupported LLM provider: {self.config.provider}")

        return provider_class(
            model=self.config.model_name,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
            api_key=self.config.api_key
        )

    def validate_inputs(self, inputs: NodeInput) -> bool:
        return "prompt" in inputs.data and (
                self.config.api_key is not None or self.config.provider not in ["openai", "google", "mistral", "groq"])

    def run(self, inputs: NodeInput) -> NodeOutput:
        if not self.validate_inputs(inputs):
            return NodeOutput(success=False, error="Missing required input: prompt or api_key")

        try:
            response = self.llm.invoke(inputs.data["prompt"])
            return NodeOutput(
                data={"response": response.content},
                metadata={"model": self.config.model_name}
            )
        except Exception as e:
            return NodeOutput(success=False, error=str(e))


# PDF Reader Node
class PDFReaderNode(BaseNode):
    def validate_inputs(self, inputs: NodeInput) -> bool:
        return "file_path" in inputs.data and os.path.exists(inputs.data["file_path"]) and "user_id" in inputs.data

    def run(self, inputs: NodeInput) -> NodeOutput:
        if not self.validate_inputs(inputs):
            return NodeOutput(
                success=False,
                error=f"File path {inputs.data.get('file_path', 'N/A')} is not a valid file or missing user_id"
            )

        try:
            loader = PDFMinerLoader(inputs.data["file_path"])
            documents = loader.load()
            logger.info(f"PDF loaded with {len(documents)} pages")
            return NodeOutput(
                data={
                    "documents": documents,
                    "user_id": inputs.data["user_id"]
                },
                metadata={"file_path": inputs.data["file_path"], "user_id": inputs.data["user_id"]}
            )
        except Exception as e:
            return NodeOutput(success=False, error=str(e))


# Vector Store Node
class VectorStoreNodeConfig(BaseModel):
    chunk_size: int = Field(default=1000)
    chunk_overlap: int = Field(default=200)
    embedding_model_name: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")


class VectorStoreNode(BaseNode):
    def __init__(self, node_id: str, name: str, config: VectorStoreNodeConfig):
        super().__init__(node_id, name)
        self.config = config
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap
        )
        self.embeddings = HuggingFaceEmbeddings(model_name=config.embedding_model_name)

    def validate_inputs(self, inputs: NodeInput) -> bool:
        return ("documents" in inputs.data or "text" in inputs.data) and "user_id" in inputs.data

    def run(self, inputs: NodeInput) -> NodeOutput:
        if not self.validate_inputs(inputs):
            return NodeOutput(success=False, error="Missing required input: documents or text, or user_id")

        try:
            if "documents" in inputs.data:
                docs = inputs.data["documents"]
            else:
                docs = [Document(page_content=inputs.data["text"])]

            user_id = inputs.data["user_id"]
            collection_name = f"user_{user_id}"
            persist_dir = f"./chroma_db/{user_id}"

            # Ensure directory exists
            os.makedirs(persist_dir, exist_ok=True)

            chunks = self.text_splitter.split_documents(docs)
            logger.info(f"Split into {len(chunks)} chunks")

            # Initialize Chroma with error handling
            try:
                vector_store = Chroma.from_documents(
                    documents=chunks,
                    embedding=self.embeddings,
                    collection_name=collection_name,
                    persist_directory=persist_dir,
                )

                # Verify collection exists and has documents
                collection = vector_store._client.get_collection(collection_name)
                doc_count = collection.count()
                logger.info(f"Vector store created with {doc_count} documents")

                if doc_count == 0:
                    raise ValueError("Vector store was created but contains no documents")

                return NodeOutput(
                    data={
                        "vector_store_id": collection_name,
                        "user_id": user_id,
                        "persist_directory": persist_dir
                    },
                    metadata={"chunk_count": len(chunks), "user_id": user_id, "doc_count": doc_count}
                )
            except Exception as e:
                logger.error(f"Chroma initialization failed: {str(e)}")
                return NodeOutput(success=False, error=f"Vector store creation failed: {str(e)}")

        except Exception as e:
            logger.error(f"Vector store node failed: {str(e)}")
            return NodeOutput(success=False, error=str(e))


# Query Node
class QueryNodeConfig(BaseModel):
    llm_provider: str = Field(default="openai")
    model_name: str = Field(default="gpt-3.5-turbo")
    api_key: Optional[str] = Field(default=None)


class QueryNode(BaseNode):
    def __init__(self, node_id: str, name: str, config: QueryNodeConfig):
        super().__init__(node_id, name)
        self.config = config
        self.llm = self._initialize_llm()
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    def _initialize_llm(self):
        providers = {
            "openai": ChatOpenAI,
            "google": ChatGoogleGenerativeAI,
            "mistral": ChatMistralAI,
            "groq": ChatGroq
        }
        provider_class = providers.get(self.config.llm_provider)
        if not provider_class:
            raise ValueError(f"Unsupported LLM provider: {self.config.llm_provider}")

        return provider_class(
            model=self.config.model_name,
            api_key=self.config.api_key
        )

    def validate_inputs(self, inputs: NodeInput) -> bool:
        required_fields = ["query", "vector_store_id", "user_id"]
        missing_fields = [field for field in required_fields if field not in inputs.data or inputs.data[field] is None]

        if missing_fields:
            logger.error(f"Missing required inputs: {', '.join(missing_fields)}")
            return False

        if self.config.api_key is None:
            logger.error("Missing API key")
            return False

        return True

    def run(self, inputs: NodeInput) -> NodeOutput:
        if not self.validate_inputs(inputs):
            return NodeOutput(success=False,
                              error="Missing required inputs: query, vector_store_id, user_id, or api_key")

        try:
            user_id = inputs.data["user_id"]
            collection_name = inputs.data["vector_store_id"]
            query = inputs.data["query"]

            # Use persist_directory from inputs if available, otherwise construct it
            persist_dir = inputs.data.get("persist_directory", f"./chroma_db/{user_id}")

            logger.info(f"Querying vector store: {collection_name} in {persist_dir}")

            # Check if the directory exists
            if not os.path.exists(persist_dir):
                return NodeOutput(success=False, error=f"Vector store directory {persist_dir} does not exist")

            # Initialize vector store
            try:
                vector_store = Chroma(
                    collection_name=collection_name,
                    embedding_function=self.embeddings,
                    persist_directory=persist_dir
                )

                # Test if collection exists and has documents
                try:
                    collection = vector_store._client.get_collection(collection_name)
                    doc_count = collection.count()
                    logger.info(f"Found {doc_count} documents in collection")

                    if doc_count == 0:
                        return NodeOutput(success=False, error="Vector store exists but contains no documents")

                except Exception as e:
                    return NodeOutput(success=False, error=f"Failed to access collection: {str(e)}")

            except Exception as e:
                return NodeOutput(success=False, error=f"Failed to initialize vector store: {str(e)}")

            # Test similarity search first
            try:
                test_results = vector_store.similarity_search(query, k=3)
                logger.info(f"Similarity search returned {len(test_results)} results")

                if not test_results:
                    # Try a broader search
                    broader_results = vector_store.similarity_search("document", k=5)
                    if not broader_results:
                        return NodeOutput(success=False, error="No documents found in vector store")
                    else:
                        logger.info(f"Broader search found {len(broader_results)} results")

            except Exception as e:
                return NodeOutput(success=False, error=f"Similarity search failed: {str(e)}")

            # Initialize QA chain
            try:
                qa_chain = RetrievalQA.from_chain_type(
                    llm=self.llm,
                    chain_type="stuff",
                    retriever=vector_store.as_retriever(search_kwargs={"k": 4}),
                    return_source_documents=True
                )

                response = qa_chain.invoke({"query": query})

                return NodeOutput(
                    data={
                        "answer": response["result"],
                        "sources": [doc.metadata for doc in response["source_documents"]],
                        "source_count": len(response["source_documents"])
                    },
                    metadata={
                        "vector_store_id": collection_name,
                        "user_id": user_id,
                        "query": query
                    }
                )
            except Exception as e:
                logger.error(f"QA chain failed: {str(e)}")
                return NodeOutput(success=False, error=f"Query processing failed: {str(e)}")

        except Exception as e:
            logger.error(f"Query node failed: {str(e)}")
            return NodeOutput(success=False, error=str(e))


# Workflow Manager
class Workflow:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.nodes: Dict[str, BaseNode] = {}

    def add_node(self, node: BaseNode):
        self.graph.add_node(node.node_id, node=node)
        self.nodes[node.node_id] = node

    def add_edge(self, source_id: str, target_id: str):
        self.graph.add_edge(source_id, target_id)

    def execute(self, start_node_id: str, initial_inputs: NodeInput) -> Dict[str, NodeOutput]:
        results = {}
        queue = [(start_node_id, initial_inputs)]
        visited = set()

        while queue:
            node_id, inputs = queue.pop(0)
            if node_id in visited:
                continue
            visited.add(node_id)

            node = self.nodes[node_id]
            logger.info(f"Executing node {node_id}: {node.name}")
            output = node.run(inputs)
            results[node_id] = output

            if output.success:
                logger.info(f"Node {node_id} succeeded")
                for successor_id in self.graph.successors(node_id):
                    # Forward all data from output and preserve original query
                    new_data = {**output.data}
                    if "query" in inputs.data:
                        new_data["query"] = inputs.data["query"]

                    # Also forward persist_directory if available
                    if "persist_directory" in output.data:
                        new_data["persist_directory"] = output.data["persist_directory"]

                    new_inputs = NodeInput(
                        data=new_data,
                        metadata={**output.metadata, **inputs.metadata}
                    )
                    queue.append((successor_id, new_inputs))
            else:
                logger.error(f"Node {node_id} failed: {output.error}")

        return results


# FastAPI App
app = FastAPI()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code
    os.makedirs("./chroma_db", exist_ok=True)
    yield


@app.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        user_id = str(uuid.uuid4())
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        logger.info(f"PDF uploaded to {temp_file_path} for user {user_id}")
        return {
            "file_path": temp_file_path,
            "user_id": user_id
        }
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        return {"error": str(e)}
    finally:
        await file.close()


@app.post("/execute_workflow")
async def execute_workflow(workflow_config: Dict[str, Any]):
    cleanup_tasks = []

    try:
        workflow = Workflow()

        # Create nodes from config
        for node_config in workflow_config.get("nodes", []):
            node_type = node_config["type"]
            node_id = node_config["id"]
            name = node_config["name"]
            config = node_config.get("config", {})

            if node_type == "llm":
                node = LLMNode(node_id, name, LLMNodeConfig(**config))
            elif node_type == "pdf_reader":
                node = PDFReaderNode(node_id, name)
            elif node_type == "vector_store":
                node = VectorStoreNode(node_id, name, VectorStoreNodeConfig(**config))
            elif node_type == "query":
                node = QueryNode(node_id, name, QueryNodeConfig(**config))
            else:
                return {"error": f"Unknown node type: {node_type}"}

            workflow.add_node(node)

        # Add edges
        for edge in workflow_config.get("edges", []):
            workflow.add_edge(edge["source"], edge["target"])

        # Execute workflow
        initial_inputs = NodeInput(data=workflow_config.get("initial_inputs", {}))
        results = workflow.execute(workflow_config["start_node"], initial_inputs)

        # Prepare cleanup tasks
        if "file_path" in initial_inputs.data:
            cleanup_tasks.append(("temp_file", initial_inputs.data["file_path"]))

        user_id = initial_inputs.data.get("user_id")
        if user_id:
            cleanup_tasks.append(("vector_store", f"./chroma_db/{user_id}"))

        return {"results": {k: v.model_dump() for k, v in results.items()}}

    except Exception as e:
        logger.error(f"Workflow execution failed: {str(e)}")
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)