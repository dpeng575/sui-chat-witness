import { useAuth } from '../hooks/useAuth';

function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 未登录状态
  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-3xl mb-2">🦭</div>
          <h1 className="text-xl font-bold text-gray-800 mb-1">Sui-Seal</h1>
          <p className="text-sm text-gray-500 mb-6">AI 对话永久存证</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            使用 Google 账号登录
          </button>

          <div className="text-xs text-gray-400 text-center mt-4">
            <p>登录后即可使用所有功能：</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• 一键跨平台对话迁移</li>
              <li>• 永久区块链存证</li>
              <li>• 对话历史搜索与管理</li>
              <li>• 多格式导出</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // 已登录状态
  return (
    <div className="w-full min-h-screen bg-gray-50 p-4">
      {/* 用户信息 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || user.email}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-800 text-sm">
              {user.name || '用户'}
            </div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          退出
        </button>
      </div>

      {/* 平台检测提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="text-sm text-blue-800 font-medium mb-1">🦭 Sui-Seal 已就绪</div>
        <div className="text-xs text-blue-600">
          正在检测当前页面...
        </div>
      </div>

      {/* 功能按钮 */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          迁移对话
        </div>
        <button className="w-full py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
          <span>🔄</span>
          迁移到 Claude
        </button>
        <button className="w-full py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
          <span>🔄</span>
          迁移到 Gemini
        </button>
        <button className="w-full py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
          <span>🔄</span>
          迁移到 Kimi
        </button>

        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-5">
          导出
        </div>
        <button className="w-full py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
          <span>📄</span>
          导出 Markdown
        </button>
        <button className="w-full py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
          <span>📄</span>
          导出 PDF
        </button>

        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-5">
          区块链存证
        </div>
        <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
          <span>🔐</span>
          存证到 Sui 链
        </button>
      </div>

      {/* 最近存证 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          最近存证
        </div>
        <div className="text-sm text-gray-400 text-center py-4">
          暂无存证记录
        </div>
      </div>
    </div>
  );
}

export default App;
