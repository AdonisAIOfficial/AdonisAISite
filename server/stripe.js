const Stripe = require('stripe');
const { STRIPE_SECRET_KEY } = require('./secrets.js');
const stripe = new Stripe(STRIPE_SECRET_KEY);
const adonisProductId = "prod_QRp1PH9aA80ISp";
const adonisPriceObjId = "price_1PdRuBC2pXt17P3qVQtEpFIr";

async function subscribe(customerId) {
    try {
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: adonisPriceObjId }]
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error };
    }
}

async function unsubscribe(customerId) {
    let subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1
    });
    let subscription = subscriptions.data[0];

    if (subscription) {
        subscription = await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: true
        });
    }

    return subscription;
}

async function createCustomer(email) {
    const customer = await stripe.customers.create({ email: email });
    return customer.id;
}

async function setCustomerSource(customerId, source) {
    await stripe.customers.update(customerId, { source: source });
}

async function getCustomer(email) {
    const customersList = await stripe.customers.search({
        query: `email:'${email}'`
    });
    return customersList.data[0];
}

async function getCustomerById(id) {
    return await stripe.customers.retrieve(id);
}

function verifyStripeSignature(body, sig, endpointSecret) {
    try {
        stripe.webhooks.constructEvent(body, sig, endpointSecret);
        return true; // Signature is valid
    } catch (err) {
        return false; // Signature is false
    }
}

module.exports = {
    subscribe,
    unsubscribe,
    createCustomer,
    setCustomerSource,
    getCustomer,
    getCustomerById,
    verifyStripeSignature
};

