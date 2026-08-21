// Express 4, async route handler'lardaki reddedilen Promise'leri otomatik
// yakalamaz. Bu sarmalayıcı hatayı next(err)'e yönlendirir; server.js'teki
// genel hata middleware'i 500 döner ve loglar.
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = { asyncHandler };
