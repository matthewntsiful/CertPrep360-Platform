function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Check if the URI ends with '/'
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    }
    // Check if the URI has no file extension (no dot in the last segment)
    else if (!uri.includes('.') && !uri.endsWith('/')) {
        request.uri += '/index.html';
    }
    
    return request;
}
