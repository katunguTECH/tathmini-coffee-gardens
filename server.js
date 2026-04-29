const express = require('express');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ==================== M-PESA FUNCTIONS ====================

// Get access token from Daraja
async function getAccessToken() {
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
    
    try {
        const response = await axios.get(
            `${process.env.DARAJA_API_URL}/oauth/v1/generate?grant_type=client_credentials`,
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
        
        console.log('Initiating STK Push for:', formattedPhone, 'Amount:', amount);
        
        const response = await axios.post(
            `${process.env.DARAJA_API_URL}/mpesa/stkpush/v1/processrequest`,
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
            `${process.env.DARAJA_API_URL}/mpesa/stkpushquery/v1/query`,
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

// ==================== API ENDPOINTS ====================

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Debug endpoint
app.get('/debug', (req, res) => {
    res.json({
        status: 'running',
        environment: process.env.NODE_ENV || 'development',
        mpesaConfigured: !!process.env.CONSUMER_KEY,
        callbackUrl: process.env.CALLBACK_URL
    });
});

// STK Push endpoint
app.post('/api/stk-push', async (req, res) => {
    try {
        // Parse form data from subscription form
        const { phone, amount, name, email, location, treesCount } = req.body;
        
        console.log('STK Push request received for:', { phone, name, email });
        
        // Validate phone number
        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }
        
        // For subscription, amount is 999
        const paymentAmount = amount || 999;
        
        // Store registration details temporarily (you can save to database)
        const accountReference = `TATH-${Date.now()}`;
        
        // Initiate STK Push
        const result = await stkPush(phone, paymentAmount, accountReference, 'Sacco Subscription');
        
        if (result.ResponseCode === '0') {
            // Save registration to memory/logger (in production, save to database)
            console.log('STK Push successful:', {
                checkoutRequestID: result.CheckoutRequestID,
                phone: phone,
                amount: paymentAmount,
                name: name,
                email: email,
                timestamp: new Date().toISOString()
            });
            
            res.json({
                success: true,
                message: 'STK Push sent successfully. Check your phone for M-Pesa prompt.',
                checkoutRequestID: result.CheckoutRequestID,
                merchantRequestID: result.MerchantRequestID
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.ResponseDescription || 'Failed to initiate payment'
            });
        }
    } catch (error) {
        console.error('STK Push endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error. Please try again.'
        });
    }
});

// Callback endpoint for M-Pesa to send payment confirmation
app.post('/api/callback', async (req, res) => {
    console.log('M-Pesa Callback received at:', new Date().toISOString());
    console.log('Callback body:', JSON.stringify(req.body, null, 2));
    
    try {
        const callbackData = req.body.Body.stkCallback;
        
        const resultCode = callbackData.ResultCode;
        const resultDesc = callbackData.ResultDesc;
        const checkoutRequestID = callbackData.CheckoutRequestID;
        const merchantRequestID = callbackData.MerchantRequestID;
        
        if (resultCode === 0) {
            // Payment successful
            console.log(`✅ Payment successful for ${checkoutRequestID}`);
            
            // Extract payment details
            const callbackMetadata = callbackData.CallbackMetadata;
            let amount, mpesaReceipt, phoneNumber, transactionDate;
            
            if (callbackMetadata && callbackMetadata.Item) {
                amount = callbackMetadata.Item.find(i => i.Name === 'Amount')?.Value;
                mpesaReceipt = callbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
                phoneNumber = callbackMetadata.Item.find(i => i.Name === 'PhoneNumber')?.Value;
                transactionDate = callbackMetadata.Item.find(i => i.Name === 'TransactionDate')?.Value;
                
                console.log(`💰 Payment Details:`);
                console.log(`   Receipt: ${mpesaReceipt}`);
                console.log(`   Amount: ${amount} KES`);
                console.log(`   Phone: ${phoneNumber}`);
                console.log(`   Date: ${transactionDate}`);
            }
            
            // TODO: Save successful registration to database
            // TODO: Send confirmation SMS/email to customer
            // TODO: Activate member account
            
        } else {
            // Payment failed
            console.log(`❌ Payment failed for ${checkoutRequestID}: ${resultDesc} (Code: ${resultCode})`);
        }
        
        // Always respond with success to M-Pesa
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
        
    } catch (error) {
        console.error('Callback processing error:', error);
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
    }
});

// Query payment status endpoint
app.post('/api/payment-status', async (req, res) => {
    try {
        const { checkoutRequestID } = req.body;
        
        if (!checkoutRequestID) {
            return res.status(400).json({ 
                success: false, 
                error: 'CheckoutRequestID is required' 
            });
        }
        
        const result = await queryStatus(checkoutRequestID);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Payment status query error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==================== SERVE FRONTEND ====================

// Root path
app.get('/', (req, res) => {
    console.log('Root path accessed');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes - serve index.html
app.get('*', (req, res) => {
    console.log(`Serving index.html for: ${req.url}`);
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Tathmini Coffee Gardens app running`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💰 M-Pesa Status: ${process.env.CONSUMER_KEY ? 'Configured ✅' : 'Not Configured ❌'}`);
    console.log(`📁 Serving files from: ${__dirname}`);
});