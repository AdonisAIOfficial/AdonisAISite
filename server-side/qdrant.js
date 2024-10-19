import {
  DEEPINFRA_API_KEY,
  QDRANT_API_KEY,
  QDRANT_URL,
} from "backend/secrets.js";
import { embeddingModel } from "public/consts.js";
async function embed(query) {
  const apiUrl = `https://api.deepinfra.com/v1/inference/BAAI/${embeddingModel}`;
  const requestOptions = {
    method: "POST",
    headers: {
      Authorization: `bearer ${DEEPINFRA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: [query] }),
  };

  try {
    const response = await fetch(apiUrl, requestOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("Error fetching from DeepInfra:", error);
    throw error;
  }
}
async function closest(vector, limit, collection) {
  const apiUrl = `${QDRANT_URL}/collections/${collection}/points/search`;

  const requestOptions = {
    method: "POST",
    headers: {
      "api-key": QDRANT_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector: vector,
      limit: limit,
      with_payload: true,
      with_vector: false,
    }),
  };

  try {
    const response = await fetch(apiUrl, requestOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("Error fetching from Qdrant:", error);
    throw error;
  }
}
export async function search(query, limit = 1) {
  try {
    const embededQuery = await embed(query);
    const queryVector = embededQuery.embeddings[0];
    const closestPoints = await closest(queryVector, limit, "AdonisCollection");
    return closestPoints;
  } catch (error) {
    console.log(error);
  }
}
export async function getActiveChat(userId, userMessage) {
  try {
    const embededMessage = await embed(userMessage);
    const messageVector = embededMessage.embeddings[0];
    const closestMessages = await closest(messageVector, 5, userId);
    console.log(closestMessages);
    let activeChat = closestMessages.map((point) => point.payload);
    return activeChat;
  } catch (error) {
    console.log(error);
  }
}
export async function createChatCollection(userId) {
  const apiUrl = `${QDRANT_URL}/collections/${userId}`;

  const requestOptions = {
    method: "PUT",
    headers: {
      "api-key": QDRANT_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vectors: {
        size: 1024,
        distance: "Cosine",
      },
    }),
  };

  try {
    const response = await fetch(apiUrl, requestOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("Error fetching from Qdrant:", error);
    throw error;
  }
}
export async function push2Vdb(userId, userMessage) {
  // implement later
}
