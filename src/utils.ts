const TWO_WEEKS_IN_MILLISECONDS = 14 * 24 * 60 * 60 * 1000;

// Check if a given string is a valid HTTP or HTTPS URL
export const isValidHttpUrl = (text: string) => {
  let url;

  try {
    url = new URL(text);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
};

export const isWithinLastTwoWeeks = (timestamp: string) => {
  const currentDate = new Date();
  const timestampDate = new Date(timestamp);

  // Calculate the difference in milliseconds between the current date and the timestamp date
  const timeDifference = currentDate.getTime() - timestampDate.getTime();

  // Check if the time difference is less than 2 weeks
  return timeDifference < TWO_WEEKS_IN_MILLISECONDS;
};
