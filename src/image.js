// data is Uint8ClampedArray array of size width * height * 4 with pixels specified (r, g, b, a) [0-255]
function savePng(filename, width, height, data) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const imageData = new ImageData(data, width, height);

  const context = canvas.getContext('2d');
  context.putImageData(imageData, 0, 0);

  const download = document.createElement('a');
  download.href = canvas.toDataURL('image/png');
  download.download = filename;
  download.click();
}

export { savePng };
