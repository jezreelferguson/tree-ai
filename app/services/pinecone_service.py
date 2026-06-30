"""
Pinecone vector store service.
Connects to Pinecone, creates the index if needed, and exposes the
LangChain PineconeVectorStore for retrieval.
"""

from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore

from app.config.settings import (
    PINECONE_API_KEY,
    PINECONE_INDEX,
    EMBEDDING_DIMENSION,
)
from app.services.embedding_service import embeddings

# ── Pinecone client 
pc = Pinecone(api_key=PINECONE_API_KEY)

# Create the index if it doesn't exist, or recreate if dimension mismatches
if pc.has_index(PINECONE_INDEX):
    desc = pc.describe_index(PINECONE_INDEX)
    if desc.dimension != EMBEDDING_DIMENSION:
        print(f"Index dimension {desc.dimension} != {EMBEDDING_DIMENSION}. Recreating…")
        pc.delete_index(PINECONE_INDEX)
        import time
        time.sleep(3)
        pc.create_index(
            name=PINECONE_INDEX,
            dimension=EMBEDDING_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        # Wait for index to be ready
        while not pc.describe_index(PINECONE_INDEX).status.get("ready", False):
            time.sleep(1)
else:
    pc.create_index(
        name=PINECONE_INDEX,
        dimension=EMBEDDING_DIMENSION,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

index = pc.Index(PINECONE_INDEX)

# ── LangChain vector store wrapper 
vector_store = PineconeVectorStore(
    index=index,
    embedding=embeddings,
    text_key="text",
)


def similarity_search(query: str, k: int = 5):
    """Return the top-k most relevant document chunks for *query*."""
    return vector_store.similarity_search(query, k=k)
