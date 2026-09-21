"""Build the persistent Chroma index from the PDFs in ``docs``."""

from __future__ import annotations

try:
    __import__('pysqlite3')
    import sys
    sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
except ModuleNotFoundError:
    # Chroma can use the bundled SQLite replacement on systems with an older SQLite.
    pass

import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY_DISABLED"] = "True"

from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma


def strip_header_lines(text: str, page_number: str): 
    """Remove the repeated headers used by the formatted handbook PDFs."""
    if page_number != '1':
        lines = text.split("\n")
        cleaned = []
        removed = 0

        for line in lines:
            if removed < 2 and line.strip() != "":
                removed += 1
                continue
            cleaned.append(line)

        return "\n".join(cleaned)


    lower_text = text.lower()
    intro_index = lower_text.find("introduction")

    if intro_index == -1:
        return text

    return text[intro_index:]



DOCS_PATH = "docs"
DB_PATH = "db"


def main():
    loader = DirectoryLoader(DOCS_PATH, glob="./*.pdf",loader_cls= PyPDFLoader)
    documents = loader.load()
    print(f"Loaded {len(documents)} documents")

    for doc in documents:
        page_number = doc.metadata.get("page_label", None)

        doc.page_content = strip_header_lines(
            doc.page_content,
            page_number=page_number
        )
        
   


    custom_separators = [
        ". ",
        "? ",
        "! ",
    ]
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1800,
        chunk_overlap=300,
        separators=custom_separators,
        keep_separator=False
        )
    
    
    chunks = text_splitter.split_documents(documents)
    

    print(f"Split into {len(chunks)} chunks")

    for chunk in chunks:
        filename = os.path.basename(chunk.metadata.get("source", ""))
        chunk.metadata["citation"] = filename
    
   

    embeddings = OllamaEmbeddings(
        model="nomic-embed-text",
        base_url=os.getenv("OLLAMA_HOST", "http://localhost:11434")
    )
    db = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)
    # Each ingestion is a complete rebuild, which prevents duplicate chunks.
    db.reset_collection()
    
    
   
    batch_size = 128

    for start in range(0, len(chunks), batch_size):
        end = start + batch_size
        batch = chunks[start:end]
        db.add_documents(batch)

        print(f"Added {min(end, len(chunks))}/{len(chunks)}")
    
  
    # Print a small sample so extraction problems are visible during ingestion.
    for i, chunk in enumerate(chunks[:10]):
        print(f"\n--- Chunk {i+1} ---")
        print(chunk.page_content)
        print("-------------------")





main()
