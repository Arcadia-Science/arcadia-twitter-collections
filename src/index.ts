require("dotenv").config();

export const run = async () => {
  // Authenticate with the Twitter API
  // Fetch the list of collection IDs we need to process
  // For each of those collections:
  //   Query the Twitter search API with the relevant search terms since the last time job was run
  //   Fetch the IDs of tweets returned from the Twitter API
  //   Add these Tweet IDs to the relevant Twitter collection using the Twitter collection API
  console.log("Hi");
  console.log(process.env);
  return true;
};

if (require.main === module) {
  run();
}
