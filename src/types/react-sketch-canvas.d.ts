declare module 'react-sketch-canvas' {
  import { ForwardRefExoticComponent, RefAttributes } from 'react';

  export interface ReactSketchCanvasProps {
    width?: string | number;
    height?: string | number;
    strokeWidth?: number;
    strokeColor?: string;
    backgroundColor?: string;
    style?: React.CSSProperties;
    className?: string;
    exportWithBackgroundImage?: boolean;
    withTimestamp?: boolean;
    allowOnlyPointerType?: string;
    backgroundImage?: string;
    preserveBackgroundImageAspectRatio?: string;
    exportWithBackgroundImage?: boolean;
    withTimestamp?: boolean;
    allowOnlyPointerType?: string;
    backgroundImage?: string;
    preserveBackgroundImageAspectRatio?: string;
  }

  export interface ReactSketchCanvasRef {
    exportPaths: () => Promise<any>;
    exportImage: (format: string) => Promise<string>;
    clearCanvas: () => Promise<void>;
    undo: () => void;
    redo: () => void;
    resetCanvas: () => void;
  }

  const ReactSketchCanvas: ForwardRefExoticComponent<ReactSketchCanvasProps & RefAttributes<ReactSketchCanvasRef>>;
  export default ReactSketchCanvas;
} 