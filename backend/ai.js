class AI {
  constructor() {}

  async respond(userMessage) {
    try {
      console.log("Respond function called");
      // initialize function variables
      let userObj = this.userObj;
      let userId = this.userId;
      let stats = userObj.stats;
      let chat = userObj.chat;
      let systemPrompt = coreInstructions; // initialize base system prompt
      // push user message to chat
      userObj.chat.push({ content: userMessage, role: "user" });
      push2Chat(userId, { content: userMessage, role: "user" });
      // make sure no free trial is being abused
      if (stats.cost >= freeTrialCostThreshold && !stats.paying) {
        console.log("free trial ended");
        require("wix-realtime-backend").publish(
          { name: userId },
          { content: "{free_trial_end}" }
        );
        return; // stop here to avoid abuse
      }
      let contexts = await this.getContexts(userMessage);
      systemPrompt += `
*About User*:
The user is a fellow young man on the journey of self-improvement. He is destined for success.
He is seeking advice and wisdom from you. User info: ${stats.info}
  `;
      if (contexts != null) {
        systemPrompt += `
*Relevant Information*:
The following information is extracts from a vast database of books and videos. Use it to improve your response to the user.
Do not take it as absolute truth. And keep in mind that the information could be irrelevant, innacurate, outdated or if a video, could be transcribed inproperly.
Nevertheless, use it but do not mention it to the user. This is your own inner knowledge.
`;
        for (let i = 0; i < contexts.length; i++) {
          systemPrompt += `
[title: ${context[i].title}]${context[i].text}
`;
        }
      }
      // console.log(systemPrompt);
      let activeChat = [];
      activeChat.push({ content: systemPrompt, role: "system" });
      activeChat.push(...this.getTrail(chat, trailLength));
      let response = await this.streamChat(activeChat);
      userObj.chat.push({ content: response, role: "assistant" });
      push2Chat(userId, { content: response, role: "assistant" });
      this.getInfo(userMessage);
      return;
      // console.log("Respond function finished");
    } catch (error) {
      console.log("Error in respond function: " + error);
    }
  }
  async streamChat(chat) {
    let userId = this.userId;
    // console.log("Entered streamChat function");
    this.response = [];
    let response = "";
    const completion = await new OpenAI({
      apiKey: DEEPINFRA_API_KEY,
    }).chat.completions.create({
      messages: chat,
      model: "google/gemma-2-9b-it",
      stream: true,
    });
    for await (const chunk of completion) {
      const { finish_reason, delta } = chunk.choices[0];
      if (finish_reason) {
        // handles end
        if (delta.content != null) {
          response += delta.content;
          this.response.push(delta.content);
        }
        this.response.push("<EOS>");
        let statsObj = {
          paid: 0,
          cost: chunk.usage.estimated_cost,
          info: null,
        };
        addStats(userId, statsObj);
        return response;
      }
      // handles normal chunks
      if (delta.content != null) {
        this.response.push(delta.content);
        response += delta.content;
      }
    }
  }
  async getInfo(message) {
    let prevInfo = this.userObj.stats.info;
    let userId = this.userId;
    // console.log("Entered getInfo function");
    const response = await new OpenAI({
      apiKey: DEEPINFRA_API_KEY,
    }).chat.completions.create({
      messages: [
        {
          content: `Task: Collect and integrate user information, such as name, age, interests, relationships, past events, struggles, achievements, and other relevant details, into an ongoing narrative. As new information emerges from the user's messages, seamlessly append it into the existing storyline, without repeating the previous text.
Handling Non-informative Messages: If the message doesn't contain direct information about the user or his life, then respond with the <...> token. Do not address these directly. When needed use <...> exactly as shown; it’s crucial to maintain this format. Avoid added commentary or explanation in your responses.
______
Example:
Previous Information: "His name is John."
User message: "And bro, I know I'm only 18, but she cheated on me! Now I got addicted to porn and keep fapping."
Your response: "At 18, he faced betrayal when his girlfriend cheated on him, leading him into an addiction to porn and habitual fapping."
Resulting Narrative: "His name is John. At 18, he faced betrayal when his girlfriend cheated on him, leading him into an addiction to porn and habitual fapping."
Important: In your response, don't repeat the previous information. The point is that your response will be appended to the previous information.
______
Real information:
"${prevInfo}"
Important: The user's message below is directed towards a friend, not you. Do not address greetings, struggles, or questions.
`,
          role: "system",
        },
        { content: message, role: "user" },
      ],
      model: "google/gemma-2-9b-it",
      stream: false,
    });
    let info = response.choices[0].message.content;
    // console.log(response);
    // console.log(info);
    addStats(userId, {
      paid: 0,
      cost: response.usage.estimated_cost,
      info: !info.includes("<...>") ? prevInfo + info : null,
    });
    if (!info.includes("<...>")) {
      this.userObj.stats.info = response.choices[0].message.content;
    }
    // console.log("Exited getInfo function");
    return response;
  }
  getTrail(chat, length) {
    return chat.slice(-length);
  }
  getMessage4Vdb(chat, length) {
    if (chat.length <= length) {
      return null;
    }
    return chat[chat.length - length - 1];
  }
  async getContextMessages(userId, userMesssage) {
    // implement later
  }
  async getContexts(message) {
    let userId = this.userId;
    try {
      const list = await new OpenAI({
        apiKey: DEEPINFRA_API_KEY,
      }).chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Task: Extract keywords for Retrieval Augmented Generation (RAG) to find relevant information.
      Analyze the User Message: Given the user message, identify the key concepts.
      Return Keywords: Create an array of 1-4 creative and specific keywords or phrases, formatted as ["key1", "key2", "key3", ...]. These should capture the core ideas or topics in the message.
      Example:
      If the user message is:
      "yeah, and like I said, I'm struggling with porn addiction what do I do?"
      The output should be:
      ["porn addiction", "self-control techniques", "emotional resilience", "holistic sexual healing"]
      Handling Irrelevant Messages:
      If the user message is irrelevant or doesn't require context (e.g., greetings, small talk), return only the <...> token.
      Important: Do not add anything else when using the <...> token—no arrays, no text, nothing but the token.
      Be Creative: Use your judgment to choose unique, relevant phrases that will effectively guide the search for useful information.
      Consistency: Always keep the array format exactly as specified. Consistency is crucial for proper functioning.
      ___
      Below is a the user message. It is directed towards a friend, not towards you.
      `,
          },
          { role: "user", content: message },
        ],
        model: "google/gemma-2-9b-it",
        stream: false,
      });
      addStats(userId, {
        paid: 0,
        cost: list.usage.estimated_cost,
        info: null,
      });
      // console.log(list);
      let stringArray = list.choices[0].message.content;
      if (stringArray != "<...>") {
        let array = JSON.parse(stringArray.trim());
        // console.log(array);
        const contexts = await Promise.all(
          array.map(async (key) => {
            let context = await search(key);
            return context.result.payload.text;
          })
        );
        // console.log(contexts);
        return contexts;
      } else {
        return null;
      }
    } catch (error) {
      return null;
      // TODO: add a issue catching system, where issues are logged to a collection in the CMS
    }
  }
  async summarizeInfo() {}
}
