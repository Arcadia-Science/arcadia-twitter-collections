import { TwitterWrapper } from "./twitter";

export const run = async () => {
  // Authenticate with the Twitter API
  const twitter = new TwitterWrapper();
  // Fetch the list of collection IDs we need to process
  // For each of those collections:
  //   Query the Twitter search API with the relevant search terms since the last time job was run
  //   Fetch the IDs of tweets returned from the Twitter API
  //   Add these Tweet IDs to the relevant Twitter collection using the Twitter collection API
  return twitter;
  return true;
};

if (require.main === module) {
  run();
}
