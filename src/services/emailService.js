import emailjs from "@emailjs/browser";

// EmailJS configuration (replace with your actual keys)
const EMAILJS_SERVICE_ID = "service_i65n67m";
const EMAILJS_TEMPLATE_ID = "template_iod5xte";
const EMAILJS_PUBLIC_KEY = "1RwOeqIi50oQZx9_G";

/**
 * Initialize EmailJS
 */
emailjs.init(EMAILJS_PUBLIC_KEY);

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
      return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
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
