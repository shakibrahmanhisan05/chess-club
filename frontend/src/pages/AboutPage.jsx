import { motion } from 'framer-motion';
import { Crown, Code, Heart, Users, Trophy, Target, Github, Linkedin, Mail } from 'lucide-react';

export default function AboutPage() {
  const developerImage = "https://customer-assets.emergentagent.com/job_chess-hub-5/artifacts/xkj2z8bb_IMG_20251109_211735~2.jpg";

  const features = [
    { icon: Users, title: 'Member Management', description: 'Track all club members with their Chess.com profiles' },
    { icon: Trophy, title: 'Live Rankings', description: 'Real-time leaderboard synced with Chess.com ratings' },
    { icon: Target, title: 'Tournament Tracking', description: 'Organize and track club tournaments and matches' },
  ];

  return (
    <div className="min-h-screen py-20" data-testid="about-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mx-auto mb-6">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            About CU EChess Society
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Chittagong University EChess Society is a vibrant community of chess enthusiasts 
            dedicated to promoting the game of chess among university students.
          </p>
        </motion.div>

        {/* Mission Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-3xl p-8 lg:p-12 mb-12"
        >
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-neutral-400 mb-4">
                We aim to create a platform where chess lovers from Chittagong University 
                can connect, compete, and improve their skills together. Through regular 
                tournaments, training sessions, and online activities, we foster a 
                supportive environment for players of all levels.
              </p>
              <p className="text-neutral-400">
                Our club integrates with Chess.com to provide real-time rankings and 
                statistics, ensuring our members can track their progress and compete 
                on a global stage.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600/20 to-cyan-600/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl mb-4">♔</div>
                  <p className="text-violet-400 font-semibold">Strategic Minds Unite</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-16"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className="glass-card rounded-2xl p-6 text-center card-hover"
            >
              <feature.icon className="w-12 h-12 text-violet-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-neutral-400 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Developer Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="gradient-border rounded-3xl overflow-hidden"
          data-testid="developer-section"
        >
          <div className="bg-[#0a0a0a] p-8 lg:p-12">
            <div className="flex items-center gap-3 mb-8">
              <Code className="w-6 h-6 text-violet-500" />
              <h2 className="text-2xl font-bold text-white">Developer</h2>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="relative"
              >
                <div className="w-48 h-48 rounded-2xl overflow-hidden border-4 border-violet-600/50">
                  <img
                    src={developerImage}
                    alt="Shakib Rahman Hisan"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
              </motion.div>

              <div className="flex-1 text-center lg:text-left">
                <h3 className="text-3xl font-bold text-white mb-2">Shakib Rahman Hisan</h3>
                <p className="text-violet-400 font-medium mb-4">Full Stack Developer</p>
                <p className="text-neutral-400 mb-6 max-w-xl">
                  Passionate about creating beautiful and functional web applications. 
                  This chess club website was built with love for the CU EChess Society 
                  community, combining modern design with powerful functionality.
                </p>
                <div className="flex justify-center lg:justify-start gap-4">
                  <a
                    href="#"
                    className="p-3 rounded-xl bg-white/5 hover:bg-violet-600/20 hover:text-violet-400 transition-colors"
                    data-testid="developer-github"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                  <a
                    href="#"
                    className="p-3 rounded-xl bg-white/5 hover:bg-violet-600/20 hover:text-violet-400 transition-colors"
                    data-testid="developer-linkedin"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a
                    href="#"
                    className="p-3 rounded-xl bg-white/5 hover:bg-violet-600/20 hover:text-violet-400 transition-colors"
                    data-testid="developer-email"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Club Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-neutral-500">
            Chittagong University EChess Society • Established for chess enthusiasts
          </p>
          <p className="text-neutral-600 text-sm mt-2">
            Promoting strategic thinking and competitive chess at the university level
          </p>
        </motion.div>
      </div>
    </div>
  );
}
