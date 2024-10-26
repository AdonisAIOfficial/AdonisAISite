import wixRealtimeBackend from "wix-realtime-backend";
import admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getDatabase, ref, get, set, push } from "firebase/database";
import { FIREBASE_CONFIG, FIREBASE_PRIVATE_KEY } from "backend/secrets.js";
import { freeTrialCostThreshold } from "public/consts.js";

// Check if Firebase app is not already initialized
let app;
if (!admin.apps.length) {
  app = initializeApp({
    credential: admin.credential.cert(FIREBASE_PRIVATE_KEY),
    databaseURL: FIREBASE_CONFIG.databaseURL,
  });
}
const db = admin.database();

// Function to get user data
export async function getUser(userId) {
  const userRef = ref(db, `Users/${userId}`);
  const snapshot = await get(userRef);
  if (snapshot.exists()) {
    return snapshot.val();
  } else {
    return null;
  }
}

// Function to save user data
export async function saveUser(userId, userObj, create = false) {
  let saveObj;
  if (create) {
    saveObj = {
      chat: {
        initial: { role: "ignore", content: "..." },
      },
      stats: {
        paid: 0,
        paying: false,
        cost: 0,
        info: "",
      },
    };
  } else {
    saveObj = userObj;
  }

  const userRef = ref(db, `Users/${userId}`);
  await set(userRef, saveObj);
  return saveObj;
}

// Function to save chat data
export async function saveChat(userId, chat) {
  const chatRef = ref(db, `Users/${userId}/chat`);
  // Convert array to an object with unique keys
  const chatObj = chat.reduce((obj, message, index) => {
    obj[`message_${index}`] = message;
    return obj;
  }, {});
  await set(chatRef, chatObj);
  return chat;
}

// Function to add mes

// Function to push a message to the chat without updating the entire object
export async function push2Chat(userId, message) {
  const chatRef = ref(db, `Users/${userId}/chat`);
  const newMessageRef = push(chatRef);
  await set(newMessageRef, message);
  return { messageId: newMessageRef.key, message: message };
}

// Function to get chat data and convert it back to an array
export async function getChat(userId) {
  const chatRef = ref(db, `Users/${userId}/chat`);
  const snapshot = await get(chatRef);
  if (snapshot.exists()) {
    const chatObj = snapshot.val();
    // Convert object back to an array, sorted by keys
    const chatArray = Object.keys(chatObj)
      .sort()
      .map((key) => chatObj[key]);
    return chatArray;
  } else {
    return [];
  }
}

// Function to get user stats
export async function getStats(userId) {
  try {
    const statsRef = ref(db, `Users/${userId}/stats`);
    const snapshot = await get(statsRef);
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }
  } catch (error) {
    throw new Error("Failed to retrieve stats: ", error);
  }
}

// Function to update user stats
export async function updateStats(userId, stats) {
  try {
    const statsRef = ref(db, `Users/${userId}/stats`);
    await set(statsRef, stats);
    return stats;
  } catch (error) {
    throw new Error("Failed to update stats: ", error);
  }
}

// Function to add to user stats
export async function addStats(userId, stats) {
  try {
    const prevStats = await getStats(userId);
    if (!prevStats) {
      throw new Error("Stats not found");
    }

    const newStats = {
      paid: stats.paid != null ? prevStats.paid + stats.paid : prevStats.paid,
      paying: stats.paying != null ? stats.paying : prevStats.paying,
      cost: stats.cost != null ? prevStats.cost + stats.cost : prevStats.cost,
      info: stats.info != null ? stats.info : prevStats.info,
    };

    if (newStats.cost >= freeTrialCostThreshold && !newStats.paying) {
      // free trial ended
      wixRealtimeBackend.publish(
        { name: userId },
        { content: "{free_trial_end}" }
      );
    }

    await updateStats(userId, newStats);
    return newStats;
  } catch (error) {
    throw new Error(error);
  }
}

export async function getChatLength(userId) {
  const url = `${FIREBASE_CONFIG.databaseURL}/Users/${userId}/chat.json?shallow=true`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${FIREBASE_PRIVATE_KEY}`, // If you need to include authorization, adjust as needed
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data) {
      return Object.keys(data).length;
    } else {
      return 0;
    }
  } catch (error) {
    console.error("Failed to retrieve chat length:", error);
    throw error; // Re-throw the error after logging
  }
}

export async function deleteChat(userId) {
  const chatRef = ref(db, `Users/${userId}/chat`);

  try {
    // Delete the entire chat object
    await set(chatRef, null);

    // Replace with an 'initial' placeholder message
    const initialMessage = {
      initial: { role: "ignore", content: "..." },
    };
    await set(chatRef, initialMessage);

    return initialMessage;
  } catch (error) {
    console.error("Failed to delete chat:", error);
    throw error; // Re-throw the error after logging
  }
}

export async function clearUserInfo(userId) {
  const infoRef = ref(db, `Users/${userId}/stats/info`);

  try {
    // clears the gathered user information
    await set(infoRef, "");
  } catch (error) {
    console.error("Failed to delete info:", error);
    throw error; // Re-throw the error after logging
  }
}
