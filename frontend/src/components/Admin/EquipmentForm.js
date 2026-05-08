import React from "react";

export default function EquipmentForm({ data, setData, image, setImage, editId, resetForm, handleSubmit, categories, setActiveTab, submitting }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        {editId ? "Update Equipment Details" : "Add New Equipment"}
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Equipment Name</label>
          <input
            disabled={submitting}
            className="w-full p-3 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:text-white disabled:opacity-50"
            placeholder="e.g. Sony A7III Camera"
            value={data.name}
            onChange={e => setData({ ...data, name: e.target.value })}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price per day (₹)</label>
            <input
              disabled={submitting}
              type="number" className="w-full p-3 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:text-white disabled:opacity-50"
              placeholder="0" value={data.price}
              onChange={e => setData({ ...data, price: e.target.value })}
            />
          </div>
          <div className="flex-1">
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Quantity Details</label>
             <input
               disabled={submitting}
               type="number" className="w-full p-3 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:text-white disabled:opacity-50"
               placeholder="1" min="0" value={data.quantity}
               onChange={e => setData({ ...data, quantity: e.target.value })}
             />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select
              disabled={submitting}
              className="w-full p-3 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:text-white capitalize disabled:opacity-50"
              value={data.category}
              onChange={e => setData({ ...data, category: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id || c._id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City Location</label>
            <select
              disabled={submitting}
              className="w-full p-3 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:text-white disabled:opacity-50"
              value={data.city}
              onChange={e => setData({ ...data, city: e.target.value })}
            >
              <option value="Jaipur">Jaipur</option>
              <option value="Ajmer">Ajmer</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            disabled={submitting}
            className="w-full p-3 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:text-white h-32 resize-none disabled:opacity-50"
            placeholder="Detailed product behavior, inclusions, limitations..."
            value={data.description}
            onChange={e => setData({ ...data, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {editId ? "Update Product Image (Optional)" : "Product Image"}
          </label>
          <input
              disabled={submitting}
              type="file" accept="image/*"
              onChange={e => setImage(e.target.files[0])}
              className="w-full p-2 border dark:border-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 disabled:opacity-50"
            />
        </div>

        <div className="flex gap-4 pt-4">
          {editId && (
             <button disabled={submitting} onClick={() => { setActiveTab("manage"); resetForm(); }} className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50">
               Cancel Edit
             </button>
          )}
          <button 
            disabled={submitting} 
            onClick={handleSubmit} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-200 disabled:bg-blue-400 disabled:cursor-wait"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processing...
              </span>
            ) : (
              editId ? "Save Changes" : "Submit Equipment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
