
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import {
  FileText, Plus, Search, Share2, Trash2, Pencil,
  LogOut, Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Heading1, Heading2,
  Loader2, Check, FilePlus2, Clock, Users, X, Eye
} from 'lucide-react';
import './App.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type Document = {
  id: string;
  title: string;
  content: any;
  owner_id: string;
  updated_at: string;
  permission?: 'viewer' | 'editor';
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [search, setSearch] = useState('');
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [error, setError] = useState('');
  const [sharingOpen, setSharingOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'viewer' | 'editor'>('editor');
  const [shareMessage, setShareMessage] = useState('');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDocumentRef = useRef<Document | null>(null);

  activeDocumentRef.current = activeDocument;

  const loadDocuments = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const loadedDocuments = data || [];

    // Fetch permissions for documents shared with this user
    const { data: shares, error: shareError } = await supabase
      .from('document_shares')
      .select('document_id, permission')
      .eq('user_id', user.id);

    if (shareError) {
      setError(shareError.message);
      setLoading(false);
      return;
    }

    const enrichedDocuments = loadedDocuments.map((doc) => {
      const share = shares?.find(
        (item) => item.document_id === doc.id
      );

      return {
        ...doc,
        permission:
          doc.owner_id === user.id ? 'editor' : share?.permission,
      };
    });

    setDocuments(enrichedDocuments);

    const savedId = sessionStorage.getItem('draftly_active_document_id');

    if (savedId) {
      const savedDocument = enrichedDocuments.find(
        (doc) => doc.id === savedId
      );

      if (savedDocument) {
        setActiveDocument(savedDocument);
      } else {
        sessionStorage.removeItem('draftly_active_document_id');
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadDocuments();
    } else {
      setDocuments([]);
      setActiveDocument(null);
    }
  }, [user, loadDocuments]);

  useEffect(() => {
    if (documents.length === 0 || activeDocument) return;

    const savedId = sessionStorage.getItem('draftly_active_document_id');
    if (!savedId) return;

    const savedDocument = documents.find((doc) => doc.id === savedId);

    if (savedDocument) {
      setActiveDocument(savedDocument);
    } else {
      sessionStorage.removeItem('draftly_active_document_id');
    }
  }, [documents, activeDocument]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },

    editable:
      activeDocument?.owner_id === user?.id ||
      activeDocument?.permission === 'editor',

    editorProps: {
      attributes: {
        class: 'document-editor',
        spellcheck: 'true',
      },
    },

    onUpdate: ({ editor }) => {
      const doc = activeDocumentRef.current;
      if (!doc) return;

      setSaveStatus('Saving...');
      if (saveTimer.current) clearTimeout(saveTimer.current);

      const content = editor.getJSON();

      saveTimer.current = setTimeout(async () => {
        const currentDoc = activeDocumentRef.current;
        if (!currentDoc || currentDoc.id !== doc.id) return;

        const { error } = await supabase
          .from('documents')
          .update({
            content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', doc.id);

        if (error) {
          setSaveStatus('Save failed');
          setError(error.message);
        } else {
          setSaveStatus('Saved');
          setDocuments((previous) =>
            previous.map((item) =>
              item.id === doc.id
                ? { ...item, content, updated_at: new Date().toISOString() }
                : item
            )
          );
        }
      }, 800);
    },
  });

  useEffect(() => {
    if (editor && activeDocument) {
      editor.commands.setContent(activeDocument.content || {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      });
      setSaveStatus('Saved');
    }
  }, [activeDocument?.id, editor]);

  useEffect(() => {
    if (!editor || !activeDocument) return;

    const canEdit =
      activeDocument.owner_id === user?.id ||
      activeDocument.permission === 'editor';

    editor.setEditable(canEdit);
  }, [editor, activeDocument, user]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        if (!data.session) {
          setError('Account created. Check your email to confirm your account, then sign in.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function createDocument() {
    setError('');

    // Verify the actual authenticated user with Supabase
    const { data: authData, error: authError } =
      await supabase.auth.getUser();
    const { data: sessionData } = await supabase.auth.getSession();

    const tokenPayload = sessionData.session?.access_token
      ? JSON.parse(atob(sessionData.session.access_token.split('.')[1]))
      : null;

    console.log('DRAFTLY SESSION DEBUG:', {
      sessionExists: !!sessionData.session,
      jwtRole: tokenPayload?.role,
      jwtUserId: tokenPayload?.sub,
      appUserId: user?.id,
    });
    console.log('DRAFTLY AUTH DEBUG:', {
      currentAppUserId: user?.id,
      supabaseUserId: authData.user?.id,
      authenticated: !!authData.user,
      authError: authError?.message,
    });

    if (authError || !authData.user) {
      setError('Authentication issue. Please sign out and sign in again.');
      return;
    }

    const authenticatedUserId = authData.user.id;

    console.log('Document owner_id being inserted:', authenticatedUserId);

    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: 'Untitled document',
        owner_id: authenticatedUserId,
        content: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
      })
      .select()
      .single();

    if (error) {
      console.error('DOCUMENT INSERT ERROR:', error);
      setError(error.message);
      return;
    }

    console.log('DOCUMENT CREATED SUCCESSFULLY:', data);

    setDocuments((previous) => [data, ...previous]);
    setActiveDocument(data);
  }

  function openDocument(doc: Document) {
    sessionStorage.setItem('draftly_active_document_id', doc.id);
    setActiveDocument(doc);
  }

  async function renameDocument() {
    if (!activeDocument) return;

    const title = window.prompt('Enter a new document title:', activeDocument.title);
    if (!title?.trim()) return;

    const { error } = await supabase
      .from('documents')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', activeDocument.id);

    if (error) {
      setError(error.message);
      return;
    }

    setActiveDocument({ ...activeDocument, title: title.trim() });
    setDocuments((previous) =>
      previous.map((doc) =>
        doc.id === activeDocument.id ? { ...doc, title: title.trim() } : doc
      )
    );
  }

  async function deleteDocument(id: string) {
    if (!window.confirm('Delete this document permanently?')) return;

    const { error } = await supabase.from('documents').delete().eq('id', id);

    if (error) {
      setError(error.message);
      return;
    }

    setDocuments((previous) => previous.filter((doc) => doc.id !== id));
    if (activeDocument?.id === id) setActiveDocument(null);
  }

  async function shareDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDocument || !shareEmail.trim()) return;

    setShareMessage('Sharing...');
    setError('');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', shareEmail.trim().toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      setShareMessage('User not found. Ask them to create an account first.');
      return;
    }

    if (profile.id === user.id) {
      setShareMessage('You already own this document.');
      return;
    }

    const { error } = await supabase.from('document_shares').upsert(
      {
        document_id: activeDocument.id,
        user_id: profile.id,
        permission: sharePermission,
      },
      { onConflict: 'document_id,user_id' }
    );

    if (error) {
      setShareMessage(error.message);
      return;
    }

    setShareMessage(`Shared with ${shareEmail.trim()} successfully.`);
    setShareEmail('');
  }

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['txt', 'md'].includes(extension || '')) {
      setError('Please upload a .txt or .md file.');
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const title = file.name.replace(/\.(txt|md)$/i, '')

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title,
          owner_id: user.id,
          content: {
            type: 'doc',
            content: text.split(/\n/).flatMap((line) => [
              {
                type: 'paragraph',
                content: line ? [{ type: 'text', text: line }] : [],
              },
            ]),
          },
        })
        .select()
        .single();

      if (error) throw error;

      setDocuments((previous) => [data, ...previous]);
      setActiveDocument(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Unable to import this file.');
    }

    e.target.value = '';
  }

  const ownedDocuments = documents.filter((doc) => doc.owner_id === user?.id);
  const sharedDocuments = documents.filter((doc) => doc.owner_id !== user?.id);
  const filteredDocuments = (activeTab: 'owned' | 'shared') => {
    const source = activeTab === 'owned' ? ownedDocuments : sharedDocuments;
    return source.filter((doc) =>
      doc.title.toLowerCase().includes(search.toLowerCase())
    );
  };

  const [activeTab, setActiveTab] = useState<'owned' | 'shared'>('owned');

  if (loading) {
    return <div className="loading-screen"><Loader2 className="spin" /> Loading Draftly...</div>;
  }

  if (!user) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="brand auth-brand"><FileText size={27} /> Draftly</div>
          <p className="eyebrow">YOUR TEAM'S WORKSPACE</p>
          <h1>{authMode === 'login' ? 'Welcome back.' : 'Create your workspace account.'}</h1>
          <p className="muted">
            {authMode === 'login'
              ? 'Sign in to continue working on your documents.'
              : 'Create an account to start writing and sharing.'}
          </p>
          <form onSubmit={handleAuth} className="auth-form">
            {authMode === 'signup' && (
              <label>
                Full name
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Your name" />
              </label>
            )}
            <label>
              Email address
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
            </label>
            {error && <div className="error-message">{error}</div>}
            <button className="primary-button full-button" disabled={authLoading}>
              {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <p className="auth-switch">
            {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); }}>
              {authMode === 'login' ? 'Create account' : 'Sign in'}
            </button>
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><FileText size={25} /> Draftly</div>
        <div className="workspace-label">WORKSPACE</div>
        <button className={`nav-item ${activeTab === 'owned' ? 'active' : ''}`} onClick={() => {
          sessionStorage.removeItem('draftly_active_document_id');
          setActiveTab('owned');
          setActiveDocument(null);
        }}>
          <FileText size={18} /> My documents <span>{ownedDocuments.length}</span>
        </button>
        <button className={`nav-item ${activeTab === 'shared' ? 'active' : ''}`} onClick={() => {
          sessionStorage.removeItem('draftly_active_document_id');
          setActiveTab('shared');
          setActiveDocument(null);
        }}>
          <Users size={18} /> Shared with me <span>{sharedDocuments.length}</span>
        </button>
        <div className="sidebar-bottom">
          <div className="user-avatar">{(user.email || 'U')[0].toUpperCase()}</div>
          <div className="user-details">
            <strong>{user.user_metadata?.full_name || 'Workspace member'}</strong>
            <small>{user.email}</small>
          </div>
          <button className="icon-button" title="Sign out" onClick={() => supabase.auth.signOut()}><LogOut size={17} /></button>
        </div>
      </aside>

      <main className="main-area">
        {activeDocument ? (
          <section className="editor-view">
            <header className="editor-topbar">
              <button
                className="back-button"
                onClick={() => {
                  sessionStorage.removeItem('draftly_active_document_id');
                  setActiveDocument(null);
                }}
              >
                ← Back
              </button>
              <div className="editor-document-title">
                <strong>{activeDocument.title}</strong>
                <span>{saveStatus === 'Saved' ? <Check size={13} /> : <Clock size={13} />} {saveStatus}</span>
              </div>
              <div className="editor-actions">
                {activeDocument.owner_id === user.id && (
                  <>
                    <button className="secondary-button" onClick={renameDocument}><Pencil size={15} /> Rename</button>
                    <button className="secondary-button" onClick={() => { setSharingOpen(true); setShareMessage(''); }}><Share2 size={15} /> Share</button>
                  </>
                )}
              </div>
            </header>
            {activeDocument.owner_id !== user.id &&
              activeDocument.permission === 'viewer' && (
                <div className="view-only-notice">
                  <Eye size={18} />
                  <div>
                    <strong>View-only access</strong>
                    <p>You can view this document, but editing is disabled.</p>
                  </div>
                </div>
              )}
            {editor && (
              <div className="editor-workspace">
                {(activeDocument.owner_id === user.id ||
                  activeDocument.permission === 'editor') && (
                    <div className="toolbar">
                      <button title="Bold" className={editor.isActive('bold') ? 'tool-active' : ''} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} /></button>
                      <button title="Italic" className={editor.isActive('italic') ? 'tool-active' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} /></button>
                      <button title="Underline" className={editor.isActive('underline') ? 'tool-active' : ''} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={17} /></button>
                      <span className="toolbar-divider" />
                      <button title="Heading 1" className={editor.isActive('heading', { level: 1 }) ? 'tool-active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={18} /></button>
                      <button title="Heading 2" className={editor.isActive('heading', { level: 2 }) ? 'tool-active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={18} /></button>
                      <span className="toolbar-divider" />
                      <button title="Bulleted list" className={editor.isActive('bulletList') ? 'tool-active' : ''} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={18} /></button>
                      <button title="Numbered list" className={editor.isActive('orderedList') ? 'tool-active' : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={18} /></button>
                    </div>)}
                <div className="paper-container">
                  <div className="paper">
                    <div className="paper-heading">
                      <span>DOCUMENT</span>
                      <span>Draftly workspace</span>
                    </div>
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="dashboard">
            <header className="dashboard-header">
              <div>
                <p className="eyebrow">YOUR WORKSPACE</p>
                <h1>{activeTab === 'owned' ? 'My documents' : 'Shared with me'}</h1>
                <p className="muted">Create, organize and collaborate on your work.</p>
              </div>
              <div className="header-actions">
                <label className="secondary-button upload-button">
                  <FilePlus2 size={17} /> Import file
                  <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={importFile} hidden />
                </label>
                <button className="primary-button" onClick={createDocument}><Plus size={18} /> New document</button>
              </div>
            </header>

            {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError('')}><X size={16} /></button></div>}

            <div className="dashboard-tools">
              <div className="search-box"><Search size={17} /><input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <span className="document-count">{filteredDocuments(activeTab).length} documents</span>
            </div>

            {filteredDocuments(activeTab).length ? (
              <div className="document-grid">
                {filteredDocuments(activeTab).map((doc) => (
                  <article className="document-card" key={doc.id}>
                    <button className="document-open" onClick={() => openDocument(doc)}>
                      <div className="document-preview"><FileText size={30} /><span>DOC</span></div>
                      <h3>{doc.title}</h3>
                      <p>{doc.owner_id === user.id ? 'Owned by you' : 'Shared with you'}</p>
                      <small>Updated {new Date(doc.updated_at).toLocaleDateString()}</small>
                    </button>
                    <div className="card-actions">
                      <button title="Open document" onClick={() => openDocument(doc)}>Open document</button>
                      {doc.owner_id === user.id && <button title="Delete document" onClick={() => deleteDocument(doc.id)}><Trash2 size={16} /></button>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><FileText size={29} /></div>
                <h2>{search ? 'No matching documents' : 'Nothing here yet'}</h2>
                <p>{search ? 'Try another search term.' : 'Your next great idea can start with a blank document.'}</p>
                {!search && activeTab === 'owned' && <button className="primary-button" onClick={createDocument}><Plus size={17} /> Create your first document</button>}
              </div>
            )}
          </section>
        )}
      </main>

      {sharingOpen && (
        <div className="modal-backdrop" onClick={() => setSharingOpen(false)}>
          <section className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <div><h2>Share document</h2><p>Invite an existing Draftly user.</p></div>
              <button className="icon-button" onClick={() => setSharingOpen(false)}><X size={19} /></button>
            </div>
            <form onSubmit={shareDocument}>
              <label>Collaborator email
                <input type="email" required placeholder="colleague@example.com" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} />
              </label>
              <label>Permission
                <select value={sharePermission} onChange={(e) => setSharePermission(e.target.value as 'viewer' | 'editor')}>
                  <option value="editor">Can edit</option>
                  <option value="viewer">Can view</option>
                </select>
              </label>
              {shareMessage && <p className="share-message">{shareMessage}</p>}
              <button className="primary-button full-button">Share document</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
