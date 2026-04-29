const axios = require('axios');

// Get access token from Daraja
async function getAccessToken() {
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
    
    try {
        const response = await axios.get(
            `${process.env.DARaja_API_URL}/oauth/v1/generate?grant_type=client_credentials`,
            {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error.response?.data || error.message);
        throw error;
    }
}

// Format phone number to 254XXXXXXXXX format
function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.toString().replace(/\D/g, '');
    
    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    }
    // If starts with +254, remove the +
    else if (cleaned.startsWith('254')) {
        cleaned = cleaned;
    }
    // If starts with 254, keep as is
    else if (cleaned.startsWith('254')) {
        cleaned = cleaned;
    }
    
    return cleaned;
}

// Generate password for STK push
function generatePassword(shortcode, passkey, timestamp) {
    const str = shortcode + passkey + timestamp;
    return Buffer.from(str).toString('base64');
}

// Initiate STK Push
async function stkPush(phoneNumber, amount, accountReference, transactionDesc) {
    try {
        const accessToken = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = generatePassword(process.env.BUSINESS_SHORT_CODE, process.env.PASSKEY, timestamp);
        
        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        const requestBody = {
            BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: process.env.BUSINESS_SHORT_CODE,
            PhoneNumber: formattedPhone,
            CallBackURL: process.env.CALLBACK_URL,
            AccountReference: accountReference || 'TathminiCoffee',
            TransactionDesc: transactionDesc || 'Sacco Subscription Fee'
        };
        
        const response = await axios.post(
            `${process.env.DARaja_API_URL}/mpesa/stkpush/v1/processrequest`,
            requestBody,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data;
    } catch (error) {
        console.error('STK Push Error:', error.response?.data || error.message);
        throw error;
    }
}

// Query STK push status
async function queryStatus(checkoutRequestID) {
    try {
        const accessToken = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = generatePassword(process.env.BUSINESS_SHORT_CODE, process.env.PASSKEY, timestamp);
        
        const requestBody = {
            BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID
        };
        
        const response = await axios.post(
            `${process.env.DARaja_API_URL}/mpesa/stkpushquery/v1/query`,
            requestBody,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return response.data;
    } catch (error) {
        console.error('Query Status Error:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { stkPush, queryStatus, formatPhoneNumber };