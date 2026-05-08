import React from "react";

export default function CategoryManager({ categories, newCat, setNewCat, handleAddCategory, handleEditCategory }) {
  return (
    <div className="max-w-2xl mx-auto">
       <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Manage Categories</h2>
       <div className="flex gap-4 mb-8">
          <input 
            className="flex-1 p-3 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:text-white outline-none" 
            placeholder="New Category Name" 
            value={newCat} 
            onChange={e=>setNewCat(e.target.value)} 
          />
          <button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-md">Add Category</button>
       </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map(c => (
             <div key={c.id} className="flex justify-between items-center p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 font-semibold capitalize text-gray-700 dark:text-gray-200 shadow-sm transition-colors">
                <span>{c.name}</span>
                <button onClick={() => handleEditCategory(c.id, c.name)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-bold underline">Edit</button>
             </div>
          ))}
       </div>
    </div>
  );
}
