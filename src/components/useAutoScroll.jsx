import React from "react";

function useAutoScroll() {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const containerElem = containerRef.current;
    if (containerElem) {
      containerElem.scrollTop = containerElem.scrollHeight;
    }
  }, []);
  return containerRef;
}

export default useAutoScroll;
