import React from "react";

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const tabs = ["All Tickets", "My Tickets", "Resolved"];

  return (
    <nav className="flex space-x-4 border-b border-gray-200 bg-white p-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`px-4 py-2 rounded-md font-medium ${
            activeTab === tab
              ? "bg-purple-500 text-white" // Changed active tab color to purple
              : "text-gray-700 hover:bg-gray-100"
          }`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
};

export default Navbar;
