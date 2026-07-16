require('dotenv').config();

/**
 * Sends a phone verification code (OTP) via SMS or WhatsApp
 * @param {string} phone - Target phone number with country prefix (e.g. +573204923304)
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<boolean>} - True if sent successfully, false otherwise
 */
async function sendPhoneVerificationCode(phone, code) {
  // In development/default setup, we log the OTP to the console.
  // In production, this can be integrated with Twilio SMS, Twilio WhatsApp, or another local carrier API.
  console.log(`\n======================================================`);
  console.log(`📱 [PHONE/WHATSAPP OTP MOCK] Sending OTP code to: ${phone}`);
  console.log(`🔑 OTP Code: ${code}`);
  console.log(`======================================================\n`);
  
  // Return true to simulate successful delivery
  return true;
}

module.exports = {
  sendPhoneVerificationCode
};
