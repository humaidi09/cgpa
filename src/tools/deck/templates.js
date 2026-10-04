// Starter decks for the Presentation Slides wizard.
//
// A student should never meet an empty form and have to guess what goes where.
// Each starter seeds the exact content shape the deck engine already expects —
// { cover, sections, closing } — so picking one is purely a head start, not a
// different code path. Every starter is a function returning a fresh object, so
// two people editing "Class presentation" never share state.

const classPresentation = () => ({
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
})

const businessPitch = () => ({
  cover: {
    eyebrow: 'Team · Project name',
    title: 'A clear idea, worth backing',
    subtitle: 'The problem we solve and why now',
    author: 'Your Name',
    org: 'Your team or company',
    date: 'October 2026',
  },
  sections: [
    {
      heading: 'The problem',
      body: 'Who feels this today, and what it costs them.',
      points: [
        { title: 'The pain', body: 'A sentence on what is broken or missing.' },
        { title: 'Who has it', body: 'The group that feels it most, in one line.' },
        { title: 'Why now', body: 'What changed that makes this the moment.' },
      ],
    },
    {
      heading: 'Our solution',
      body: 'What we built, in one sentence.',
      points: [
        { title: 'What it is', body: 'The product, described plainly.' },
        { title: 'How it works', body: 'The one mechanism that makes it better.' },
        { title: 'Why it wins', body: 'The advantage that is hard to copy.' },
      ],
    },
    {
      heading: 'Traction & ask',
      body: 'What we have proven, and what we need next.',
      points: [
        { title: 'Progress', body: 'The numbers or milestones so far.' },
        { title: 'The ask', body: 'What you want from the audience.' },
        { title: 'Next step', body: 'The single thing that happens after this.' },
      ],
    },
  ],
  closing: { eyebrow: 'Thank you', title: 'Let’s talk', body: 'Happy to go deeper on any part of this.' },
})

const blank = () => ({
  cover: { eyebrow: '', title: '', subtitle: '', author: '', org: '', date: '' },
  sections: [
    { heading: '', body: '', points: [{ title: '', body: '' }] },
  ],
  closing: { eyebrow: 'Thank you', title: 'Questions?', body: '' },
})

// Each entry describes one card in the "Start" step. `make()` is called on
// click so the same starter can be picked twice without sharing references.
export const STARTERS = [
  {
    id: 'class',
    name: 'Class presentation',
    blurb: 'For a course topic or lab — a course tag, your department, and three clear sections to fill in.',
    useFor: 'Assignments · Seminars · Lab work',
    make: classPresentation,
  },
  {
    id: 'business',
    name: 'Business pitch',
    blurb: 'Problem, solution, and the ask — the shape most pitch decks are expected to follow.',
    useFor: 'Startups · Group projects · Proposals',
    make: businessPitch,
  },
  {
    id: 'blank',
    name: 'Start from blank',
    blurb: 'An empty deck with nothing but placeholders. Best if you already know exactly what you want.',
    useFor: 'Any topic',
    make: blank,
  },
]
