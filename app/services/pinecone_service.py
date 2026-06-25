from pinecone import Pinecone

from app.config.settings import (
    PINECONE_API_KEY,
    PINECONE_INDEX
)

pc = Pinecone(api_key=PINECONE_API_KEY)

index = pc.Index(PINECONE_INDEX)

