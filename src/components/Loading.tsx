import React from "react";
// import "../css/Loading.css";

const Loading: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading servers...</p>
    </div>
  );
};

export default Loading;
