import { TwitterAPI, ETwitterStreamEvent } from "./twitter";
const twitter = new TwitterAPI();
const stream = twitter.getStream();

const gracefulExit = (err: Error) => {
  console.error(err);
  stream.close();
};

process.on("SIGTERM", gracefulExit);
process.on("SIGINT", gracefulExit);
process.on("unhandledRejection", gracefulExit);

const streamTweets = async () => {
  // const allRules = await twitter.getAllStreamRules();
  // console.log(allRules);
  // await twitter.deleteRulesFromStream(allRules.data.map((rule) => rule.id));

  stream.on(ETwitterStreamEvent.ConnectionError, (err) =>
    console.error("Connection error: ", err)
  );

  stream.on(ETwitterStreamEvent.ConnectionClosed, () =>
    console.log("Connection has been closed.")
  );

  stream.on(ETwitterStreamEvent.Connected, () =>
    console.log("Connection has been established.")
  );

  stream.on(ETwitterStreamEvent.DataKeepAlive, () =>
    console.log("Twitter heartbeat.")
  );

  stream.on(ETwitterStreamEvent.Data, async (eventData) => {
    const { data, matching_rules } = eventData;
    for (const { tag } of matching_rules) {
      // Filter out test tags
      if (!tag.startsWith("custom-")) continue;
      const collectionId = tag;
      const tweetId = data.id;

      try {
        // TODO: Improve error handling for retries
        // I don't expect to be a big problem for us, but for outside users,
        // it may be a problem depending on tweet volume.
        await twitter.addTweetToCollection(collectionId, tweetId);
      } catch (err) {
        console.error(err);
      }
    }
  });

  // Start stream!
  await stream.connect({
    autoReconnect: true,
    autoReconnectRetries: Infinity,
  });
};

if (require.main === module) {
  streamTweets();
}
