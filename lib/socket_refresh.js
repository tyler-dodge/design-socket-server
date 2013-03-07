var socket = io.connect('http://localhost:3000');
socket.on('refresh', function (file) {
  var styles = document.styleSheets;
  for (var i = 0; i < styles.length; i++) {
    if (styles[i].ownerNode.href &&
        styles[i].ownerNode.href.match(file) !== null) {
      styles[i].ownerNode.href+="?5";
    }
  }
});
