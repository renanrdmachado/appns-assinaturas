const {User} = require('../database/database'); // import the database

const get = async (id = null) => {

    if( id ) {
        const user = await User.findOne({
            where: { id: id },
        });
        console.log("Model / User: ",user);
        return user;
    } else {
        const user = await User.findAll();
        console.log("Model / User: ",user);
        return user;
    }
    
}

const create = ( data ) => {
    console.log('User - creating...');

    User.upsert({
        username: data.username,
        email: data.email,
        password: data.password,
        seller_id: data.seller_id
    }).then(user => {
        console.log('User created - before:', user[0].dataValues);
        var dataJson = user[0].dataValues;
        console.log('User created:', dataJson);
        return dataJson;
    });
}

module.exports = {
    create,
    get
}