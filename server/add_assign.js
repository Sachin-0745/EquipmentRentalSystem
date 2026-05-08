const fs = require('fs');
let code = fs.readFileSync('controllers/adminController.js', 'utf8');

const newEndpoint = 
exports.assignDeliveryBoy = async (req, res, next) => {
  try {
    const { delivery_boy_id } = req.body;
    const rental = await Rental.findById(req.params.id);

    if (!rental) return res.status(404).json({ error: "Rental not found" });

    const deliveryBoy = await User.findOne({ _id: delivery_boy_id, role: 'delivery_boy' });
    if (!deliveryBoy) return res.status(404).json({ error: "Delivery boy not found or invalid role" });

    rental.delivery_boy_id = delivery_boy_id;
    rental.delivery_status = 'assigned';
    await rental.save();

    res.json({ success: true, message: "Order assigned to delivery boy successfully" });
  } catch (err) {
    next(err);
  }
};
;

code = code + newEndpoint;
fs.writeFileSync('controllers/adminController.js', code);
console.log('Added assignDeliveryBoy to adminController.js');

let routes = fs.readFileSync('routes/admin.js', 'utf8');
const routeLine = outer.put("/orders/:id/assign-delivery", adminController.assignDeliveryBoy);\n;
routes = routes.replace('module.exports = router;', routeLine + '\nmodule.exports = router;');
fs.writeFileSync('routes/admin.js', routes);
console.log('Added assign delivery route to admin.js');
