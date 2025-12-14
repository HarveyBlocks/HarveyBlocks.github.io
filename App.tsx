import React, {useState, useEffect} from 'react';
import {User, Sparkles, BrainCircuit, Heart, Share2, RefreshCw, ChevronRight} from 'lucide-react';
import {AppStage, UserProfile} from './types';
import {QUESTIONS, FINAL_TAGS} from './constants';
import {Button} from './components/Button';
import {ProgressBar} from './components/ProgressBar';

const App: React.FC = () => {
    const [stage, setStage] = useState<AppStage>(AppStage.WELCOME);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [profile, setProfile] = useState<UserProfile>({nickname: '', gender: ''});
    const [result, setResult] = useState<string>('');

    // Fake animation progress for the "Analyzing" stage
    const [analyzingProgress, setAnalyzingProgress] = useState(0);

    // Stats for the result page
    const [stats, setStats] = useState({
        emotion: 0,
        social: 0,
        purity: 0,
        defense: 0
    });

    const startQuiz = () => {
        setStage(AppStage.QUIZ);
        setCurrentQuestionIndex(0);
    };

    const handleAnswer = () => {
        if (currentQuestionIndex < QUESTIONS.length - 1) {
            // Add a tiny delay for better UX feel before switching
            setTimeout(() => {
                setCurrentQuestionIndex(prev => prev + 1);
                window.scrollTo(0, 0);
            }, 200);
        } else {
            setStage(AppStage.PROFILE);
        }
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (profile.nickname && profile.gender) {
            setStage(AppStage.ANALYZING);
        }
    };

    // Logic to simulate complex analysis loading
    useEffect(() => {
        if (stage === AppStage.ANALYZING) {
            const interval = setInterval(() => {
                setAnalyzingProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        // Pick a random result
                        const randomTag = FINAL_TAGS[Math.floor(Math.random() * FINAL_TAGS.length)];
                        setResult(randomTag);
                        setStage(AppStage.RESULT);
                        return 100;
                    }
                    // Non-linear progress increment for realism
                    return prev + Math.floor(Math.random() * 15) + 1;
                });
            }, 300);
            return () => clearInterval(interval);
        }
    }, [stage]);

    // Effect to trigger stats animation when Result screen mounts
    useEffect(() => {
        if (stage === AppStage.RESULT) {
            // Wait a brief moment after mounting to trigger the width transition
            const timer = setTimeout(() => {
                setStats({
                    emotion: Math.floor(Math.random() * 40) + 60, // 60-100
                    social: Math.floor(Math.random() * 80) + 20,  // 20-100
                    purity: Math.floor(Math.random() * 90) + 10,  // 10-100
                    defense: Math.floor(Math.random() * 70) + 30  // 30-100
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [stage]);

    const restart = () => {
        setStage(AppStage.WELCOME);
        setProfile({nickname: '', gender: ''});
        setResult('');
        setAnalyzingProgress(0);
        setCurrentQuestionIndex(0);
        setStats({emotion: 0, social: 0, purity: 0, defense: 0});
    };

    // --------------------------------------------------------------------------
    // Render Stages
    // --------------------------------------------------------------------------

    // 1. Welcome Screen
    if (stage === AppStage.WELCOME) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-6 text-white">
                <div className="w-full max-w-md text-center space-y-8 fade-in">
                    <div className="bg-white/20 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/30">
                        <div className="flex justify-center mb-4">
                            <BrainCircuit className="w-20 h-20 text-white animate-pulse"/>
                        </div>
                        <h1 className="text-4xl font-bold mb-2 tracking-tight">灵魂成分<br/>鉴定所</h1>
                        <p className="text-indigo-100 text-lg opacity-90">
                            透过 {QUESTIONS.length} 道深度心理题<br/>
                            揭示你潜意识里最真实的人设标签
                        </p>
                    </div>

                    <div className="space-y-4">
                        <Button onClick={startQuiz}
                                className=" text-indigo-600 hover:bg-indigo-50 shadow-lg text-xl py-4">
                            开始鉴定
                        </Button>
                        <p className="text-xs text-white/60">已有 10,234 人参与测试</p>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Quiz Screen
    if (stage === AppStage.QUIZ) {
        const question = QUESTIONS[currentQuestionIndex];
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col p-4">
                <div className="max-w-md w-full mx-auto pt-4 flex-1 flex flex-col">
                    <ProgressBar current={currentQuestionIndex + 1} total={QUESTIONS.length}/>

                    {/* Key ensures animation triggers on every question change */}
                    <div key={currentQuestionIndex} className="flex-1 flex flex-col justify-center fade-in">
                        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
              <span
                  className="inline-block px-3 py-1 bg-indigo-100 text-indigo-600 text-xs font-bold rounded-full mb-4">
                问题 {currentQuestionIndex + 1}
              </span>
                            <h2 className="text-2xl font-bold text-gray-800 leading-snug">
                                {question.text}
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {question.options.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={handleAnswer}
                                    className="w-full text-left p-4 rounded-xl bg-white border-2 border-transparent hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 shadow-sm flex items-center justify-between group"
                                >
                  <span className="text-gray-700 font-medium text-lg group-hover:text-indigo-700">
                    {option.text}
                  </span>
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500"/>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Profile Input Screen
    if (stage === AppStage.PROFILE) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 fade-in">
                    <div className="text-center mb-8">
                        <User className="w-16 h-16 text-indigo-500 mx-auto mb-4 bg-indigo-50 p-3 rounded-full"/>
                        <h2 className="text-2xl font-bold text-gray-800">最后一步</h2>
                        <p className="text-gray-500 mt-2">生成你的专属灵魂报告前，请完善以下信息</p>
                    </div>

                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">你的昵称</label>
                            <input
                                type="text"
                                required
                                value={profile.nickname}
                                onChange={(e) => setProfile({...profile, nickname: e.target.value})}
                                placeholder="请输入昵称"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">你的性别</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setProfile({...profile, gender: 'male'})}
                                    className={`py-3 rounded-xl border-2 font-medium transition-all ${
                                        profile.gender === 'male'
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 text-gray-500 hover:border-indigo-200'
                                    }`}
                                >
                                    男生 ♂
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProfile({...profile, gender: 'female'})}
                                    className={`py-3 rounded-xl border-2 font-medium transition-all ${
                                        profile.gender === 'female'
                                            ? 'border-pink-500 bg-pink-50 text-pink-700'
                                            : 'border-gray-200 text-gray-500 hover:border-pink-200'
                                    }`}
                                >
                                    女生 ♀
                                </button>
                            </div>
                        </div>

                        <Button onClick={() => {
                        }} disabled={!profile.nickname || !profile.gender} className="mt-8">
                            生成报告
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    // 4. Analyzing Loading Screen
    if (stage === AppStage.ANALYZING) {
        return (
            <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white">
                <div className="text-center space-y-6 w-full max-w-xs">
                    <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 border-4 border-indigo-300 rounded-full opacity-30"></div>
                        <div
                            className="absolute inset-0 border-4 border-white rounded-full border-t-transparent animate-spin"></div>
                        <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-yellow-300 animate-pulse"/>
                    </div>

                    <h2 className="text-2xl font-bold tracking-wider animate-pulse">正在分析灵魂样本...</h2>

                    <div className="w-full bg-indigo-900/50 rounded-full h-4 overflow-hidden backdrop-blur">
                        <div
                            className="bg-gradient-to-r from-yellow-300 to-pink-500 h-full transition-all duration-300"
                            style={{width: `${Math.min(100, analyzingProgress)}%`}}
                        ></div>
                    </div>

                    <p className="text-indigo-200 text-sm">
                        {analyzingProgress < 30 && "正在解析情感回路..."}
                        {analyzingProgress >= 30 && analyzingProgress < 70 && "正在比对人际关系模型..."}
                        {analyzingProgress >= 70 && "正在生成最终画像..."}
                    </p>
                </div>
            </div>
        );
    }

    // 5. Result Screen
    if (stage === AppStage.RESULT) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-6 flex flex-col items-center">
                <div
                    className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-purple-100 fade-in my-auto">

                    {/* Header Card */}
                    <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-center text-white relative overflow-hidden">
                        <div
                            className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                        <Heart className="w-12 h-12 mx-auto mb-4 text-pink-300 fill-current animate-bounce"/>
                        <p className="text-indigo-100 mb-1 opacity-80">经鉴定，{profile.nickname} 的真实成分是</p>
                        <div className="w-16 h-1 bg-white/30 mx-auto rounded-full mt-4"></div>
                    </div>

                    {/* Result Content */}
                    <div className="p-8 text-center">
                        <div className="mb-8">
                            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-600 to-pink-600 leading-tight py-2 filter drop-shadow-sm">
                                {result}
                            </h1>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-left bg-gray-50 p-4 rounded-xl mb-8">
                            <div className="space-y-1">
                                <span className="text-xs text-gray-400">情感指数</span>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-pink-400 transition-all duration-1000 ease-out"
                                        style={{width: `${stats.emotion}%`}}
                                    ></div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-gray-400">社交牛逼症</span>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-400 transition-all duration-1000 ease-out"
                                        style={{width: `${stats.social}%`}}
                                    ></div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-gray-400">纯一度</span>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 transition-all duration-1000 ease-out"
                                        style={{width: `${stats.purity}%`}}
                                    ></div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-gray-400">防御力</span>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-400 transition-all duration-1000 ease-out"
                                        style={{width: `${stats.defense}%`}}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button onClick={() => alert('未实现！')} variant="primary"
                                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 border-none">
                                <Share2 className="w-5 h-5"/>
                                分享给好友
                            </Button>
                            <Button onClick={restart} variant="ghost"
                                    className="flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4"/>
                                再测一次
                            </Button>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-gray-400 text-xs text-center">
                    本测试纯属娱乐，如有雷同，纯属巧合。<br/>
                    Soul Label Agency &copy; 2024
                </p>
            </div>
        );
    }

    return null;
};

export default App;