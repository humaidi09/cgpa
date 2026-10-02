// Export the app's real sample deck (the BFS presentation the Deck Builder
// opens with) to a .pptx through the same export path the page uses.
import { writeFileSync } from 'node:fs'
import { buildDeckFile } from '../src/tools/deck/exportPptx.js'
import { themeById } from '../src/tools/deck/themes.js'
import { buildDeck } from '../src/tools/deck/layouts.js'

// This is the exact SAMPLE content from pages/PresentationSlides.jsx.
const SAMPLE = {
  cover: {
    eyebrow: 'CSE 2101 · Algorithms',
    title: 'Breadth-First Search, Explained',
    subtitle: 'Traversal, shortest paths, and where it breaks down',
    author: 'Your Name',
    org: 'Department of Computer Science',
    date: 'October 2026',
  },
  sections: [
    {
      heading: 'The idea',
      body: 'A queue, a visited set, and one rule: explore by distance.',
      points: [
        { title: 'Start at the source', body: 'Enqueue the source node and mark it visited.' },
        { title: 'Expand in order', body: 'Dequeue a node, enqueue its unvisited neighbours.' },
        { title: 'Level by level', body: 'Every node is reached by the shortest number of edges.' },
      ],
    },
    {
      heading: 'Shortest paths',
      body: 'In an unweighted graph, the first time you reach a node is via a shortest path.',
      points: [
        { title: 'Distance array', body: 'dist[v] = dist[u] + 1 when v is first discovered.' },
        { title: 'Parent pointers', body: 'Reconstruct the path by walking parents back to the source.' },
        { title: 'Uniform cost', body: 'Works only when every edge costs the same.' },
      ],
    },
    {
      heading: 'Limits',
      body: 'Where BFS stops being the right tool.',
      points: [
        { title: 'Weighted graphs', body: 'Use Dijkstra instead — BFS ignores edge weights.' },
        { title: 'Memory', body: 'The frontier can hold a whole level of the graph at once.' },
        { title: 'Infinite spaces', body: 'Unbounded graphs may never terminate without a goal test.' },
      ],
    },
  ],
  closing: { eyebrow: 'Thank you', title: 'Questions?', body: 'Happy to walk through the traversal on the board.' },
}

const theme = themeById(process.argv[2] || 'fjord')
const meta = { author: SAMPLE.cover.author, org: SAMPLE.cover.org, course: SAMPLE.cover.eyebrow }
const slides = buildDeck(SAMPLE)

const bytes = await buildDeckFile({
  slides, theme, meta, transition: 'fade',
  title: SAMPLE.cover.title, outputType: 'nodebuffer',
})
if (!bytes || bytes.length < 5000) throw new Error('export did not run')

const out = new URL('../tmp-deck-svg/bfs-deck.pptx', import.meta.url)
writeFileSync(out, bytes)
console.log(`wrote ${out.pathname.replace(/%20/g, ' ')} — ${bytes.length} bytes, ${slides.length} slides, theme ${theme.id}`)
console.log('slide types:', slides.map((s) => s.type).join(', '))
