import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Streamlining Academic Project Excellence
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              From team formation to final results—CampusCurator unifies the entire project lifecycle for administrators, mentors, and students in one organized platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/auth/login" 
                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg font-semibold text-center transition"
              >
                STUDENT ACCESS
              </Link>
              <Link 
                href="/auth/login" 
                className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-lg font-semibold text-center transition"
              >
                FACULTY PORTAL
              </Link>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center">
            <div className="w-full h-80 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center shadow-xl">
              <div className="text-center px-8">
                <div className="text-2xl font-bold text-slate-700">Campus Illustration</div>
                <div className="text-sm text-slate-500 mt-2">Visual representation placeholder</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            The CampusCurator Workflow
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '⚙️', title: 'Drive Creation', desc: 'Admins set batch parameters, deadlines, and mentor lists.' },
              { icon: '👥', title: 'Group Formation', desc: 'Students form teams, select leaders, and invite members.' },
              { icon: '🤝', title: 'Mentor Allotment', desc: 'Smart assignment based on preferences and capacity.' },
              { icon: '📄', title: 'Synopsis Submission', desc: 'Teams propose ideas; mentors review and approve.' },
              { icon: '📊', title: 'Checkpoints', desc: 'Mid-term tracking with structured mentor feedback.' },
              { icon: '🏆', title: 'Result Declaration', desc: 'Final grading and consolidated marks.' }
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="text-5xl mb-4">{step.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tailored Features for Every User
            </h2>
            <p className="text-gray-600">
              Key capabilities for Administrators, Mentors and Students
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Administrators',
                items: ['Centralized Drive Management', 'Automated Student Grouping', 'Override Capabilities', 'Holistic Progress Tracking']
              },
              {
                title: 'Mentors',
                items: ['Clear Evaluation Dashboards', 'Easy Synopsis Approval', 'Structured Feedback Tools', 'Manage Multiple Groups']
              },
              {
                title: 'Students',
                items: ['Simple Team Creation', 'Clear Milestone Deadlines', 'Direct Mentor Communication', 'Track Academic Progress']
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-md border-t-4 border-slate-800 hover:shadow-xl transition">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <ul className="space-y-2 text-gray-600">
                  {feature.items.map((item, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-teal-600 mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/careers">Careers</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/help">Help Center</Link></li>
                <li><Link href="/contact">Contact Support</Link></li>
                <li><Link href="/faq">FAQs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#">Twitter</a></li>
                <li><a href="#">LinkedIn</a></li>
                <li><a href="#">University Partnerships</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-gray-400 pt-8 border-t border-gray-700">
            © {new Date().getFullYear()} CampusCurator. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}