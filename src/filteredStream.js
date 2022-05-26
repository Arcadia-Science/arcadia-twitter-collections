import { TwitterAPI, ETwitterStreamEvent } from "./twitter";
const twitter = new TwitterAPI();

const streamTweets = async () => {
  // await twitter.addRulesToStream([
  //   { value: "twitter", tag: "custom-1529596980950757376" },
  // ]);
  const stream = twitter.getStream();

  stream.on(ETwitterStreamEvent.ConnectionError, (err) =>
    console.error("Connection error!", err)
  );

  stream.on(ETwitterStreamEvent.ConnectionClosed, () =>
    console.log("Connection has been closed.")
  );

  stream.on(ETwitterStreamEvent.Connected, () => console.log("YAY."));

  stream.on(ETwitterStreamEvent.Data, async (eventData) => {
    console.log("Twitter has sent something:", eventData);
    const { data, matching_rules } = eventData;
    for (const { tag } of matching_rules) {
      if (!tag.startsWith("custom-")) continue;
      const collectionId = tag;
      const tweetId = data.id;
      console.log(tweetId, collectionId);
      try {
        await twitter.addTweetToCollection(collectionId, tweetId);
      } catch (e) {
        console.log(e);
      }
    }
  });

  stream.on(ETwitterStreamEvent.DataKeepAlive, () =>
    console.log("Twitter has a keep-alive packet.")
  );

  // Start stream!
  await stream.connect({
    autoReconnect: true,
    autoReconnectRetries: Infinity,
  });
};

streamTweets();
