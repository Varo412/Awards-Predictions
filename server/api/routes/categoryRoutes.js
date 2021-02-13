'use strict';
module.exports = function (app) {
    const categories = require('../controllers/categoryController');

    // user Routes
    app.route('/awardsEvents/:awardId/categories')
        .get(categories.listAllCategories)
        .post(categories.createCategory);

    app.route('/awardsEvents/:awardId/categories/:categoryId')
        .get(categories.getCategory)
};