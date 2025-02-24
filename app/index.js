const express = require('express');
const app = express();
const port = 10000;

// Routes
app.use(express.json());

// Nuvemshop Routes
    const routesNs = require('./routes/NsRoute'); // import the routes
    app.get('/ns/install', routesNs.install); // use the routes

// App Routes
    const routesApp = require('./routes/AppRoute'); // import the routes
    app.get('/app/products', routesApp.getProducts); // use the routes
    app.get('/app/products/:id', routesApp.getProductById); // use the routes
    app.post('/app/products', routesApp.addProduct); // use the routes

    app.get('/app/orders', routesApp.getOrders); // use the routes
    app.get('/app/orders/:id', routesApp.getOrderById); // use the routes
    app.post('/app/orders', routesApp.addOrder); // use the routes

    app.get('/app/sellers', routesApp.getSellers); // use the routes
    app.get('/app/sellers/:id', routesApp.getSellerById); // use the routes
    app.post('/app/sellers', routesApp.addSeller); // use the routes

    app.get('/app/sellers/:id/subscriptions', routesApp.getSellerSubscriptions); // use the routes
    app.post('/app/sellers/:id/subscriptions', routesApp.addSellerSubscription); // use the routes

    app.get('/app/users', routesApp.getUsers); // use the routes
    app.get('/app/users/:id', routesApp.getUserById); // use the routes
    app.post('/app/users', routesApp.addUser); // use the routes

// Asaas Routes
    const routesAsaas = require('./routes/AsaasRoute'); // import the routes
    app.post('/app/asaas/customer', routesAsaas.addCustomer);


app.listen(port, function () {
    console.log("Started application on port %d", port)
});