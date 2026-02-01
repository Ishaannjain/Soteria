// EmailJS configuration
const EMAILJS_SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;

/**
 * Send email using EmailJS REST API (works in React Native)
 * @param {object} templateParams - Template parameters
 */
const sendEmailViaREST = async (templateParams) => {
  const data = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    template_params: templateParams,
  };

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EmailJS API error: ${response.status} - ${errorText}`);
  }

  return response;
};

/**
 * Send emergency alert to circle members
 * @param {string} userName - Name of user in danger
 * @param {object} location - {lat, lng}
 * @param {array} recipients - Array of member emails
 */
export const sendEmergencyAlert = async (userName, location, recipients) => {
  try {
    const mapLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    const promises = recipients.map((email) => {
      return sendEmailViaREST({
        to_email: email,
        user_name: userName,
        last_location: `${location.lat}, ${location.lng}`,
        alert_time: new Date().toLocaleString(),
        map_link: mapLink,
      });
    });

    await Promise.all(promises);
    console.log(`Emergency alerts sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error("Error sending emergency alerts:", error);
    throw error;
  }
};
