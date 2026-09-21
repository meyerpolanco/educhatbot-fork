"""Retrieve relevant PDF chunks and generate a locally grounded answer."""

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

from langchain_chroma import Chroma
from langchain_ollama import ChatOllama, OllamaEmbeddings

from langchain_core.prompts import PromptTemplate
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from src.services.citation_service import CitationService



DB_PATH = "db"
LLM_MODEL = "qwen3:8b"
EMBED_MODEL = "nomic-embed-text"
        

def main():
    ollama_url = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    embedding_model = OllamaEmbeddings(model=EMBED_MODEL,
                                       base_url=ollama_url
                                       )

    # Query embeddings must use the same model that created the stored vectors.
    db = Chroma(persist_directory=DB_PATH, embedding_function=embedding_model)
    retriever = db.as_retriever(search_kwargs={"k": 5})


    llm = ChatOllama(
        model=LLM_MODEL,
        base_url=ollama_url,
        reasoning=False,  # Return only the user-facing answer text.
        temperature=0.2,
        num_predict=1024
    )

    prompt = PromptTemplate(
        input_variables=["context", "input"],
        template=(
          """You are a policy research assistant that answers questions using ONLY the provided CONTEXT_EXCERPTS.
          Your purpose is to help researchers and policy creators understand infromation contained in the excerpts.

            Your goals:
            - Give a clear, helpful answer grounded in the excerpts.
            - Synthesize across multiple excerpts when relevant.
            - Prefer precise wording from the excerpts when possible.
            - Be concise, accurate, and easy to read.


            Rules:
            - Do not introduce facts that are not supported by the excerpts.
            - Do not reference quotes not found in CONTEXT_EXCERPTS.
            - If the excerpts do not contain enough information, explicitly say so.
            - If excerpts conflict, briefly describe the conflict and reflect both sides.

            Handling missing information:
            If the excerpts do not contain enough information, respond with:

            "The provided excerpts do not contain sufficient information about: <topic>."

            Then suggest 1–3 specific additional queries, keywords, or document types that may help answer the question.

        


            Output format (always follow):


            Response
            No more than 6 sentences answering the question directly. 


            Key details
            - 2-4 short bullets that support or expand the response.
            - Use quotations from CONTEXT_EXCERPTS when useful, do not paraphrase these quotations
            - Each bullet should reference the relevant excerpt number and the filename of that excerpt if available.



            CONTEXT_EXCERPTS:
            {context}


            USER_QUESTION:
            {input}

            """
        ),
    )

    document_prompt = PromptTemplate(
        input_variables = ["page_content", "citation"], 
        template= "{page_content}\n"
        "[Source: {citation}]"
    )

    document_chain = create_stuff_documents_chain(llm, prompt, document_prompt=document_prompt)
    # The five retrieved chunks are inserted into one prompt for the chat model.
    rag_chain = create_retrieval_chain(retriever, document_chain)

    import sys

    question = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else input("Question: ")
    question = question.strip()

    result = rag_chain.invoke({"input": question})

    docs = result.get("context", [])

    # Build the source list from retrieved metadata rather than model-generated text.
    citation_service = CitationService()
    citations = citation_service.extract_citations_from_documents(docs)
    formatted_citations = citation_service.format_citations_for_response(citations)

    answer = result.get("answer") or result.get("result") or str(result)
    print("Answer:")
    print(answer + formatted_citations)

if __name__ == "__main__":
    main()
