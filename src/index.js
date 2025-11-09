class Redirect {
    constructor(destination, status, pathForwarding) {
        // e.g. https://example.com
        this.destination = destination
        // 302, 301, 307 or 308
        this.status = status
        // retention the extra path: /demo/other_load?xxx -> /destination/other_load?xxx
        this.pathForwarding = pathForwarding
    }
}

const REDIRECT_TREE = {
    '/demo': new Redirect('https://example.com', 302, false),
    '/demoinfo': new Redirect('https://www.iana.org/help/example-domains', 302, false),
    '/github': new Redirect('https://github.com', 302, true),
    '/sub': {
        '/google': new Redirect('https://about.google', 302, false),
    },
}

function noRouterError(url) {
    console.error('Invalid router path: ' + url.pathname)
    return new Response('Request URI invalid', { status: 400 })
}

/*
    Return the key(not value) of the matched node

    Hash table ⊂⁠(⁠(⁠・⁠▽⁠・⁠)⁠)⁠⊃
*/
function scanRedirectTreeLayer(node, path) {
    let routerEnd = path.indexOf('/', 1)
    let router = path.slice(0, routerEnd !== -1 ? routerEnd : undefined)

    return node[router] !== undefined ? router : null
}

export default {
    async fetch(request) {
        const url = new URL(request.url)

        // parse the config tree
        let node = REDIRECT_TREE
        let remainingPath = url.pathname
        while (true) {
            let nodeKey = scanRedirectTreeLayer(node, remainingPath)
            if (nodeKey == null) {
                return noRouterError(url)
            }
            remainingPath = remainingPath.slice(nodeKey.length)

            node = node[nodeKey]
            if (node instanceof Redirect) break
        }

        // prepare redirect URL
        let destinationUrl = node.destination
        if (node.pathForwarding == true) {
            destinationUrl += `${remainingPath}${url.search}`
        }

        console.log(`Redirect ${url.pathname} -> ${destinationUrl}`)
        return Response.redirect(destinationUrl, node.status)
    },
}
