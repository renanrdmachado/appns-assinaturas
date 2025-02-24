const nsController = require('../controllers/NsController');

const install = async (req, res) => {
    await nsController.authorize(req,res);
}

exports.install = install;
