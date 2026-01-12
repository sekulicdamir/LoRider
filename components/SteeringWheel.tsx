import React, { useState, useEffect, useRef } from 'react';

interface SteeringWheelProps {
  onSteer: (angle: number) => void;
  currentAngle: number;
}

export const SteeringWheel: React.FC<SteeringWheelProps> = ({ onSteer, currentAngle }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startAngle, setStartAngle] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Helper to calculate angle from center of wheel
  const getAngle = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    // atan2 returns radians, convert to degrees
    return Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  };

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    const angle = getAngle(clientX, clientY);
    setStartAngle(angle - currentAngle);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const rawAngle = getAngle(clientX, clientY);
    let newAngle = rawAngle - startAngle;

    // Limit steering to realistic rotation (e.g., -120 to 120 degrees)
    if (newAngle > 120) newAngle = 120;
    if (newAngle < -120) newAngle = -120;

    onSteer(newAngle);
  };

  const handleEnd = () => {
    setIsDragging(false);
    // Auto-centering is now handled by the parent component's game loop
  };

  // Global mouse/touch listeners to handle dragging outside the element
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd = () => handleEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  return (
    <div className="relative flex justify-center items-center w-full h-full pointer-events-auto">
      <div
        ref={wheelRef}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        style={{ transform: `rotate(${currentAngle}deg)` }}
        className="w-64 h-64 md:w-80 md:h-80 rounded-full border-8 border-gray-800 bg-gray-900/90 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing backdrop-blur-md"
      >
        {/* Inner Hub */}
        <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center">
          <div className="text-yellow-500 font-bold text-xs tracking-widest">LR</div>
        </div>
        {/* Spokes */}
        <div className="absolute w-full h-4 bg-gray-800 top-1/2 left-0 -translate-y-1/2 -z-10" />
        <div className="absolute w-4 h-1/2 bg-gray-800 bottom-0 left-1/2 -translate-x-1/2 -z-10" />
        
        {/* Grip Texture Details */}
        <div className="absolute top-0 w-4 h-8 bg-yellow-500 rounded-b-sm" /> 
      </div>
    </div>
  );
};