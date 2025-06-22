# Add to your existing reader.py
if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) > 2 and sys.argv[1] == '--mode':
        mode = sys.argv[2]
        
        if mode == 'process_qa' and len(sys.argv) > 4:
            input_file = sys.argv[4]
            
            # Process PDF and extract Q&A pairs
            # Use your existing RAG logic here
            qa_pairs = extract_qa_from_pdf(input_file)  # Implement this using your RAG
            
            # Output as JSON for the Node.js backend
            print(json.dumps(qa_pairs))