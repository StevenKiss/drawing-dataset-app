import { ReactSketchCanvas } from 'react-sketch-canvas';

const styles = {
    border: '2px solid #000',
    borderRadius: '8px',
    width: '100%',
    height: '400px',
};

export default function Canvas({ canvasRef }) {
    return (
      <ReactSketchCanvas
        ref={canvasRef}
        style={styles}
        strokeWidth={25}
        strokeColor="black"
        backgroundColor="white"
      />
    );
}
