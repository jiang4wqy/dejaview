import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Problem } from './components/Problem'
import { Workflow } from './components/Workflow'
import { VerdictDemo } from './components/VerdictDemo'
import { Personas } from './components/Personas'
import { FinalCta } from './components/FinalCta'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <>
      <div className="bg-grid" aria-hidden />
      <div className="bg-glow" aria-hidden />
      <Header />
      <main id="main">
        <Hero />
        <Problem />
        <Workflow />
        <VerdictDemo />
        <Personas />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
