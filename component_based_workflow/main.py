# component_based_workflow/main.py - Groq Integration

import os
import json
import logging
import tempfile
import uuid
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from dataclasses import dataclass
from contextlib import asynccontextmanager
import networkx as nx

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PDFMinerLoader
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain_groq import ChatGroq  # Main Groq import
from langchain_openai import ChatOpenAI  # Fallback option
from langchain_google_genai import ChatGoogleGenerativeAI  # Alternative option

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data Models
@dataclass
class NodeInput:
    data: Dict[str, Any]
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

@dataclass
class NodeOutput:
    success: bool
    data: Dict[str, Any] = None
    metadata: Dict[str, Any] = None
    error: str = None

    def __post_init__(self):
        if self.data is None:
            self.data = {}
        if self.metadata is None:
            self.metadata = {}

# Base Node Class
class BaseNode:
    def __init__(self, node_id: str, name: str):
        self.node_id = node_id
        self.name = name

    def validate_inputs(self, inputs: NodeInput) -> bool:
        return True

    def run(self, inputs: NodeInput) -> NodeOutput:
        raise NotImplementedError

# Configuration Models with Groq Defaults
class LLMNodeConfig(BaseModel):
    provider: str = Field(default="groq")
    model_name: str = Field(default="llama-3.3-70b-versatile")
    temperature: float = Field(default=0.7)
    max_tokens: int = Field(default=2048)
    api_key: Optional[str] = Field(default=None)

class VectorStoreNodeConfig(BaseModel):
    chunk_size: int = Field(default=1000)
    chunk_overlap: int = Field(default=200)
    embedding_model_name: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")

class QueryNodeConfig(BaseModel):
    llm_provider: str = Field(default="groq")
    model_name: str = Field(default="llama-3.3-70b-versatile")
    api_key: Optional[str] = Field(default=None)

class MCQGeneratorConfig(BaseModel):
    llm_provider: str = Field(default="groq")
    model_name: str = Field(default="llama-3.3-70b-versatile")
    api_key: Optional[str] = Field(default=None)
    num_questions: int = Field(default=10)
    difficulty_level: str = Field(default="medium")

# LLM Node with Groq Support
class LLMNode(BaseNode):
    def __init__(self, node_id: str, name: str, config: LLMNodeConfig):
        super().__init__(node_id, name)
        self.config = config
        self.llm = self._initialize_llm()

    def _initialize_llm(self):
        providers = {
            "groq": ChatGroq,
            "openai": ChatOpenAI,
            "google": ChatGoogleGenerativeAI
        }
        provider_class = providers.get(self.config.provider)
        if not provider_class:
            raise ValueError(f"Unsupported LLM provider: {self.config.provider}")

        # Groq-specific initialization
        if self.config.provider == "groq":
            return ChatGroq(
                model=self.config.model_name,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                api_key=self.config.api_key,
                max_retries=3  # Groq-specific setting
            )
        else:
            return provider_class(
                model=self.config.model_name,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                api_key=self.config.api_key
            )

    def validate_inputs(self, inputs: NodeInput) -> bool:
        return "prompt" in inputs.data and self.config.api_key is not None

    def run(self, inputs: NodeInput) -> NodeOutput:
        if not self.validate_inputs(inputs):
            return NodeOutput(success=False, error="Missing required input: prompt or api_key")

        try:
            response = self.llm.invoke(inputs.data["prompt"])
            return NodeOutput(
                data={"response": response.content},
                metadata={"model": self.config.model_name, "provider": self.config.provider}
            )
        except Exception as e:
            return NodeOutput(success=False, error=str(e))

# PDF Reader Node (unchanged)
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

# Vector Store Node (unchanged)
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
        return "documents" in inputs.data and "user_id" in inputs.data

    def run(self, inputs: NodeInput) -> NodeOutput:
        if not self.validate_inputs(inputs):
            return NodeOutput(success=False, error="Missing required inputs: documents or user_id")

        try:
            documents = inputs.data["documents"]
            user_id = inputs.data["user_id"]

            texts = self.text_splitter.split_documents(documents)
            logger.info(f"Split into {len(texts)} chunks")

            collection_name = f"collection_{user_id}_{uuid.uuid4().hex[:8]}"
            persist_dir = f"./chroma_db/{user_id}"
            
            os.makedirs(persist_dir, exist_ok=True)

            vector_store = Chroma.from_documents(
                documents=texts,
                embedding=self.embeddings,
                collection_name=collection_name,
                persist_directory=persist_dir
            )

            logger.info(f"Vector store created with collection: {collection_name}")

            return NodeOutput(
                data={
                    "vector_store": vector_store,
                    "vector_store_id": collection_name,
                    "user_id": user_id,
                    "persist_directory": persist_dir,
                    "chunk_count": len(texts)
                },
                metadata={
                    "collection_name": collection_name,
                    "user_id": user_id,
                    "persist_directory": persist_dir
                }
            )
        except Exception as e:
            return NodeOutput(success=False, error=str(e))

# Query Node with Groq Support
class QueryNode(BaseNode):
    def __init__(self, node_id: str, name: str, config: QueryNodeConfig):
        super().__init__(node_id, name)
        self.config = config
        self.llm = self._initialize_llm()
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    def _initialize_llm(self):
        providers = {
            "groq": ChatGroq,
            "openai": ChatOpenAI,
            "google": ChatGoogleGenerativeAI
        }
        provider_class = providers.get(self.config.llm_provider)
        if not provider_class:
            raise ValueError(f"Unsupported LLM provider: {self.config.llm_provider}")

        if self.config.llm_provider == "groq":
            return ChatGroq(
                model=self.config.model_name,
                api_key=self.config.api_key,
                max_retries=3,
                temperature=0.1  # Lower temperature for more consistent responses
            )
        else:
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

            persist_dir = inputs.data.get("persist_directory", f"./chroma_db/{user_id}")

            logger.info(f"Querying vector store: {collection_name} in {persist_dir}")

            if not os.path.exists(persist_dir):
                return NodeOutput(success=False, error=f"Vector store directory {persist_dir} does not exist")

            try:
                vector_store = Chroma(
                    collection_name=collection_name,
                    embedding_function=self.embeddings,
                    persist_directory=persist_dir
                )

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

            try:
                test_results = vector_store.similarity_search(query, k=3)
                logger.info(f"Similarity search returned {len(test_results)} results")

                if not test_results:
                    broader_results = vector_store.similarity_search("document", k=5)
                    if not broader_results:
                        return NodeOutput(success=False, error="No documents found in vector store")

            except Exception as e:
                return NodeOutput(success=False, error=f"Similarity search failed: {str(e)}")

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
                        "query": query,
                        "provider": self.config.llm_provider
                    }
                )
            except Exception as e:
                logger.error(f"QA chain failed: {str(e)}")
                return NodeOutput(success=False, error=f"Query processing failed: {str(e)}")

        except Exception as e:
            logger.error(f"Query node failed: {str(e)}")
            return NodeOutput(success=False, error=str(e))

# MCQ Generator Node with Groq Optimization
class MCQGeneratorNode(BaseNode):
    def __init__(self, node_id: str, name: str, config: MCQGeneratorConfig):
        super().__init__(node_id, name)
        self.config = config
        self.llm = self._initialize_llm()
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    def _initialize_llm(self):
        providers = {
            "groq": ChatGroq,
            "openai": ChatOpenAI,
            "google": ChatGoogleGenerativeAI
        }
        provider_class = providers.get(self.config.llm_provider)
        if not provider_class:
            raise ValueError(f"Unsupported LLM provider: {self.config.llm_provider}")

        if self.config.llm_provider == "groq":
            return ChatGroq(
                model=self.config.model_name,
                api_key=self.config.api_key,
                max_retries=3,
                temperature=0.3,  # Balanced creativity for MCQ generation
                max_tokens=1000   # Sufficient for MCQ responses
            )
        else:
            return provider_class(
                model=self.config.model_name,
                api_key=self.config.api_key
            )

    def validate_inputs(self, inputs: NodeInput) -> bool:
        required_fields = ["vector_store_id", "user_id"]
        return all(field in inputs.data for field in required_fields) and self.config.api_key is not None

    def run(self, inputs: NodeInput) -> NodeOutput:
        if not self.validate_inputs(inputs):
            return NodeOutput(success=False, error="Missing required inputs or API key")

        try:
            user_id = inputs.data["user_id"]
            collection_name = inputs.data["vector_store_id"]
            persist_dir = inputs.data.get("persist_directory", f"./chroma_db/{user_id}")

            logger.info(f"Generating MCQ questions from vector store: {collection_name} using {self.config.llm_provider}")

            if not os.path.exists(persist_dir):
                return NodeOutput(success=False, error=f"Vector store directory {persist_dir} does not exist")

            vector_store = Chroma(
                collection_name=collection_name,
                embedding_function=self.embeddings,
                persist_directory=persist_dir
            )

            questions = []
            question_prompts = self._get_question_prompts()

            for i in range(self.config.num_questions):
                try:
                    prompt = question_prompts[i % len(question_prompts)]
                    mcq_question = self._generate_single_mcq(vector_store, prompt)
                    if mcq_question:
                        questions.append(mcq_question)
                        logger.info(f"Generated question {i + 1}/{self.config.num_questions}")
                except Exception as e:
                    logger.error(f"Error generating question {i + 1}: {str(e)}")
                    continue

            logger.info(f"Successfully generated {len(questions)} MCQ questions using {self.config.llm_provider}")

            return NodeOutput(
                data={
                    "mcq_questions": questions,
                    "question_count": len(questions)
                },
                metadata={
                    "vector_store_id": collection_name,
                    "user_id": user_id,
                    "difficulty": self.config.difficulty_level,
                    "provider": self.config.llm_provider,
                    "model": self.config.model_name
                }
            )

        except Exception as e:
            logger.error(f"MCQ generation failed: {str(e)}")
            return NodeOutput(success=False, error=str(e))

    def _get_question_prompts(self):
        # Optimized prompts for Groq/Llama models
        difficulty_prompts = {
            "easy": [
                "Create a simple multiple choice question about basic facts or definitions from the document",
                "Generate a straightforward question about key terms mentioned in the text",
                "Make an easy factual question about information clearly stated in the document"
            ],
            "medium": [
                "Create a multiple choice question that tests understanding of concepts and their relationships",
                "Generate a question requiring analysis or interpretation of the document content",
                "Make a question about the practical applications of ideas discussed in the text"
            ],
            "hard": [
                "Create a complex analytical question requiring synthesis of multiple concepts from the document",
                "Generate a challenging question that tests critical thinking about the document's arguments",
                "Make a difficult question requiring evaluation or comparison of ideas presented in the text"
            ]
        }
        
        return difficulty_prompts.get(self.config.difficulty_level, difficulty_prompts["medium"])

    def _generate_single_mcq(self, vector_store, base_prompt):
        try:
            # Groq-optimized MCQ generation prompt
            mcq_prompt = f"""{base_prompt}

You must create ONE multiple choice question based on the document content.

RESPOND WITH ONLY THIS JSON FORMAT:

{{
  "question": "Clear, specific question text",
  "options": {{
    "A": "First answer option",
    "B": "Second answer option", 
    "C": "Third answer option",
    "D": "Fourth answer option"
  }},
  "correct_answer": "A",
  "explanation": "Brief reason why this answer is correct"
}}

RULES:
- Question must be based on document content
- All 4 options must be plausible
- Only ONE option is correct
- Keep options similar in length
- No "all of the above" or "none of the above"
- Return ONLY the JSON, no other text"""

            # Get relevant context (optimized for Groq)
            docs = vector_store.similarity_search(base_prompt, k=2)
            context = "\n".join([doc.page_content[:600] for doc in docs])  # Limit context for Groq efficiency
            
            full_prompt = f"DOCUMENT CONTENT:\n{context}\n\n{mcq_prompt}"

            # Generate response with Groq
            response = self.llm.invoke(full_prompt)
            response_text = response.content.strip()

            # Parse JSON response
            mcq_data = self._parse_mcq_response(response_text)
            return mcq_data

        except Exception as e:
            logger.error(f"Error in _generate_single_mcq: {str(e)}")
            return None

    def _parse_mcq_response(self, response_text):
        try:
            # Clean response text for better JSON parsing
            response_text = response_text.strip()
            
            # Remove any markdown formatting
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "").strip()

            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if not json_match:
                logger.error("No JSON found in response")
                return None

            json_str = json_match.group(0)
            mcq_data = json.loads(json_str)

            # Validate structure
            required_fields = ["question", "options", "correct_answer", "explanation"]
            if not all(field in mcq_data for field in required_fields):
                logger.error("Missing required fields in MCQ response")
                return None

            # Validate options
            if not all(opt in mcq_data["options"] for opt in ["A", "B", "C", "D"]):
                logger.error("Missing option choices A, B, C, or D")
                return None

            # Validate correct answer
            if mcq_data["correct_answer"] not in ["A", "B", "C", "D"]:
                logger.error("Invalid correct_answer value")
                return None

            return {
                "question": mcq_data["question"].strip(),
                "option_a": mcq_data["options"]["A"].strip(),
                "option_b": mcq_data["options"]["B"].strip(),
                "option_c": mcq_data["options"]["C"].strip(),
                "option_d": mcq_data["options"]["D"].strip(),
                "correct_answer": mcq_data["correct_answer"],
                "explanation": mcq_data["explanation"].strip(),
                "difficulty": self.config.difficulty_level
            }

        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            logger.error(f"Response text: {response_text[:200]}...")
            return None
        except Exception as e:
            logger.error(f"Error parsing MCQ response: {str(e)}")
            return None

# Workflow Manager (unchanged)
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
                    new_data = {**output.data}
                    if "query" in inputs.data:
                        new_data["query"] = inputs.data["query"]

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

# FastAPI App with Groq Integration
app = FastAPI(title="MCQ Generator API with Groq", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code
    os.makedirs("./chroma_db", exist_ok=True)
    logger.info("MCQ Generator API with Groq support started")
    yield

# Upload PDF endpoint
@app.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...), user_id: str = Form(...)):
    try:
        # Save uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        logger.info(f"Processing PDF for user {user_id}: {file.filename}")

        # Create workflow
        workflow = Workflow()

        # Create nodes
        pdf_reader = PDFReaderNode("pdf_reader", "PDF Reader")
        vector_store_config = VectorStoreNodeConfig()
        vector_store = VectorStoreNode("vector_store", "Vector Store", vector_store_config)

        # Add nodes to workflow
        workflow.add_node(pdf_reader)
        workflow.add_node(vector_store)
        workflow.add_edge("pdf_reader", "vector_store")

        # Execute workflow
        initial_inputs = NodeInput(data={"file_path": tmp_file_path, "user_id": user_id})
        results = workflow.execute("pdf_reader", initial_inputs)

        # Clean up
        os.unlink(tmp_file_path)

        # Check results
        if results["vector_store"].success:
            return {
                "success": True,
                "message": "PDF processed successfully",
                "vector_store_id": results["vector_store"].data["vector_store_id"],
                "chunk_count": results["vector_store"].data["chunk_count"]
            }
        else:
            return {
                "success": False,
                "error": results["vector_store"].error
            }

    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Generate MCQ questions endpoint with Groq
@app.post("/generate_mcq")
async def generate_mcq(
    user_id: str = Form(...),
    vector_store_id: str = Form(...),
    num_questions: int = Form(10),
    difficulty: str = Form("medium"),
    llm_provider: str = Form("groq"),
    api_key: str = Form(...)
):
    try:
        logger.info(f"Generating {num_questions} MCQ questions for user {user_id} using {llm_provider}")

        # Validate Groq API key
        if llm_provider == "groq" and not api_key:
            raise HTTPException(status_code=400, detail="Groq API key is required")

        # Set model based on provider
        model_mapping = {
            "groq": "llama-3.3-70b-versatile",
            "openai": "gpt-3.5-turbo",
            "google": "gemini-pro"
        }
        
        model_name = model_mapping.get(llm_provider, "llama-3.3-70b-versatile")

        # Create MCQ generator configuration
        mcq_config = MCQGeneratorConfig(
            llm_provider=llm_provider,
            model_name=model_name,
            api_key=api_key,
            num_questions=num_questions,
            difficulty_level=difficulty
        )

        # Create MCQ generator node
        mcq_generator = MCQGeneratorNode("mcq_generator", "MCQ Generator", mcq_config)

        # Prepare inputs
        inputs = NodeInput(data={
            "user_id": user_id,
            "vector_store_id": vector_store_id,
            "persist_directory": f"./chroma_db/{user_id}"
        })

        # Generate MCQ questions
        result = mcq_generator.run(inputs)

        if result.success:
            return {
                "success": True,
                "questions": result.data["mcq_questions"],
                "count": result.data["question_count"],
                "vector_store_id": vector_store_id,
                "provider": llm_provider,
                "model": model_name
            }
        else:
            return {
                "success": False,
                "error": result.error
            }

    except Exception as e:
        logger.error(f"MCQ generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Query endpoint with Groq support
@app.post("/query")
async def query_document(
    user_id: str = Form(...),
    vector_store_id: str = Form(...),
    query: str = Form(...),
    api_key: str = Form(...),
    llm_provider: str = Form("groq")
):
    try:
        logger.info(f"Processing query for user {user_id} using {llm_provider}")

        # Set model based on provider
        model_mapping = {
            "groq": "llama-3.3-70b-versatile",
            "openai": "gpt-3.5-turbo",
            "google": "gemini-pro"
        }
        
        model_name = model_mapping.get(llm_provider, "llama-3.3-70b-versatile")

        # Create query configuration
        query_config = QueryNodeConfig(
            llm_provider=llm_provider,
            model_name=model_name,
            api_key=api_key
        )

        # Create query node
        query_node = QueryNode("query", "Query", query_config)

        # Prepare inputs
        inputs = NodeInput(data={
            "user_id": user_id,
            "vector_store_id": vector_store_id,
            "query": query,
            "persist_directory": f"./chroma_db/{user_id}"
        })

        # Execute query
        result = query_node.run(inputs)

        if result.success:
            return {
                "success": True,
                "answer": result.data["answer"],
                "sources": result.data["sources"],
                "source_count": result.data["source_count"],
                "provider": llm_provider,
                "model": model_name
            }
        else:
            return {
                "success": False,
                "error": result.error
            }

    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "service": "MCQ Generator API with Groq",
        "supported_providers": ["groq", "openai", "google"],
        "default_provider": "groq",
        "default_model": "llama-3.3-70b-versatile"
    }

# Model information endpoint
@app.get("/models")
async def get_available_models():
    return {
        "groq_models": [
            {
                "id": "llama-3.3-70b-versatile",
                "name": "Llama 3.3 70B Versatile",
                "description": "Best for high-quality MCQ generation",
                "context_window": 131072,
                "recommended": True
            },
            {
                "id": "llama-3.1-8b-instant",
                "name": "Llama 3.1 8B Instant",
                "description": "Fast and cost-effective for basic MCQs",
                "context_window": 131072,
                "recommended": False
            },
            {
                "id": "mixtral-8x7b-32768",
                "name": "Mixtral 8x7B",
                "description": "Good for complex reasoning",
                "context_window": 32768,
                "recommended": False
            }
        ],
        "openai_models": [
            {
                "id": "gpt-3.5-turbo",
                "name": "GPT-3.5 Turbo",
                "description": "Fallback option",
                "recommended": False
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting MCQ Generator API with Groq support...")
    uvicorn.run(app, host="0.0.0.0", port=8000)