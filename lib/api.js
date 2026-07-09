import { supabase } from './supabase';

let todosCache = null;
const questionsCache = {}; // todoId -> questions
let sharedCodesCache = null;

// Helper to log timing
const logTiming = (name, startTime) => {
  const duration = Date.now() - startTime;
  console.log(`[Client Supabase Query: ${name}] took ${duration} ms`);
};

export const todoService = {
  getTodos: async (forceRefresh = false) => {
    if (todosCache && !forceRefresh) {
      console.log('[Client Cache Hit] getTodos');
      return todosCache;
    }
    const start = Date.now();
    console.time('Client Supabase: getTodos');
    const { data, error } = await supabase
      .from('todos')
      .select('id, title, completed, created_date')
      .order('created_date', { ascending: false })
      .order('id', { ascending: false });
    console.timeEnd('Client Supabase: getTodos');
    logTiming('getTodos', start);

    if (error) throw error;

    console.time('Client Supabase: getTodos - questions');
    const qStart = Date.now();
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, todo_id, title');
    console.timeEnd('Client Supabase: getTodos - questions');
    logTiming('getTodos - questions', qStart);

    if (qError) throw qError;

    // Group questions by todo_id
    const questionsMap = {};
    questions.forEach(q => {
      if (!questionsMap[q.todo_id]) {
        questionsMap[q.todo_id] = [];
      }
      questionsMap[q.todo_id].push(q);
    });

    todosCache = data.map(todo => ({
      ...todo,
      created_date: todo.created_date,
      questions: questionsMap[todo.id] || []
    }));

    return todosCache;
  },

  createTodo: async (title) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const createdDate = `${yyyy}-${mm}-${dd}`;

    const start = Date.now();
    console.time('Client Supabase: createTodo');
    const { data, error } = await supabase
      .from('todos')
      .insert({ title: title.trim(), completed: false, created_date: createdDate })
      .select('id, title, completed, created_date')
      .single();
    console.timeEnd('Client Supabase: createTodo');
    logTiming('createTodo', start);

    if (error) throw error;

    const newTodo = { ...data, questions: [] };
    if (todosCache) {
      todosCache = [newTodo, ...todosCache];
    }
    return newTodo;
  },

  updateTodo: async (id, updateData) => {
    const start = Date.now();
    console.time(`Client Supabase: updateTodo ${id}`);
    const { data, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', id)
      .select('id, title, completed, created_date')
      .single();
    console.timeEnd(`Client Supabase: updateTodo ${id}`);
    logTiming(`updateTodo ${id}`, start);

    if (error) throw error;

    if (todosCache) {
      todosCache = todosCache.map(todo => {
        if (todo.id === id) {
          return { ...todo, ...data };
        }
        return todo;
      });
    }
    return data;
  },

  deleteTodo: async (id) => {
    const start = Date.now();
    console.time(`Client Supabase: deleteTodo ${id}`);
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);
    console.timeEnd(`Client Supabase: deleteTodo ${id}`);
    logTiming(`deleteTodo ${id}`, start);

    if (error) throw error;

    if (todosCache) {
      todosCache = todosCache.filter(todo => todo.id !== id);
    }
    delete questionsCache[id];
    return { success: true };
  },
};

export const questionService = {
  getQuestions: async (todoId, forceRefresh = false) => {
    const numericTodoId = parseInt(todoId);
    if (questionsCache[numericTodoId] && !forceRefresh) {
      console.log(`[Client Cache Hit] getQuestions for Todo ${todoId}`);
      return questionsCache[numericTodoId];
    }
    const start = Date.now();
    console.time(`Client Supabase: getQuestions for Todo ${todoId}`);
    const { data, error } = await supabase
      .from('questions')
      .select('id, todo_id, title, notes, code, updated_at')
      .eq('todo_id', numericTodoId)
      .order('id', { ascending: true });
    console.timeEnd(`Client Supabase: getQuestions for Todo ${todoId}`);
    logTiming(`getQuestions for Todo ${todoId}`, start);

    if (error) throw error;

    questionsCache[numericTodoId] = data || [];
    return questionsCache[numericTodoId];
  },

  getQuestion: async (id) => {
    const start = Date.now();
    console.time(`Client Supabase: getQuestion ${id}`);
    const { data, error } = await supabase
      .from('questions')
      .select('id, todo_id, title, notes, code, updated_at')
      .eq('id', id)
      .maybeSingle();
    console.timeEnd(`Client Supabase: getQuestion ${id}`);
    logTiming(`getQuestion ${id}`, start);

    if (error) throw error;
    return data;
  },

  createQuestion: async (todoId, data) => {
    const numericTodoId = parseInt(todoId);
    const start = Date.now();
    console.time(`Client Supabase: createQuestion for Todo ${todoId}`);
    const { data: newQuestion, error } = await supabase
      .from('questions')
      .insert({
        todo_id: numericTodoId,
        title: data.title.trim(),
        notes: data.notes || '',
        code: data.code || ''
      })
      .select('id, todo_id, title, notes, code, updated_at')
      .single();
    console.timeEnd(`Client Supabase: createQuestion for Todo ${todoId}`);
    logTiming(`createQuestion for Todo ${todoId}`, start);

    if (error) throw error;

    if (questionsCache[numericTodoId]) {
      questionsCache[numericTodoId] = [...questionsCache[numericTodoId], newQuestion];
    }
    
    // Also update questions list in the todosCache for search matching
    if (todosCache) {
      todosCache = todosCache.map(todo => {
        if (todo.id === numericTodoId) {
          const matchQ = todo.questions || [];
          return {
            ...todo,
            questions: [...matchQ, { id: newQuestion.id, todo_id: numericTodoId, title: newQuestion.title }]
          };
        }
        return todo;
      });
    }
    return newQuestion;
  },

  updateQuestion: async (id, updateData) => {
    const start = Date.now();
    console.time(`Client Supabase: updateQuestion ${id}`);
    const { data, error } = await supabase
      .from('questions')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, todo_id, title, notes, code, updated_at')
      .single();
    console.timeEnd(`Client Supabase: updateQuestion ${id}`);
    logTiming(`updateQuestion ${id}`, start);

    if (error) throw error;

    const numericTodoId = data.todo_id;
    if (questionsCache[numericTodoId]) {
      questionsCache[numericTodoId] = questionsCache[numericTodoId].map(q => q.id === id ? data : q);
    }
    
    // Update matching question in todosCache too
    if (todosCache) {
      todosCache = todosCache.map(todo => {
        if (todo.id === numericTodoId) {
          const updatedQs = (todo.questions || []).map(q => q.id === id ? { ...q, title: data.title } : q);
          return { ...todo, questions: updatedQs };
        }
        return todo;
      });
    }
    return data;
  },

  deleteQuestion: async (id) => {
    const start = Date.now();
    console.time(`Client Supabase: deleteQuestion ${id}`);
    
    // We need to fetch the question first to know its todo_id for cache invalidation
    const { data: qData, error: fetchError } = await supabase
      .from('questions')
      .select('todo_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !qData) {
      console.timeEnd(`Client Supabase: deleteQuestion ${id}`);
      throw fetchError || new Error('Question not found');
    }

    const numericTodoId = qData.todo_id;

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);
    console.timeEnd(`Client Supabase: deleteQuestion ${id}`);
    logTiming(`deleteQuestion ${id}`, start);

    if (error) throw error;

    if (questionsCache[numericTodoId]) {
      questionsCache[numericTodoId] = questionsCache[numericTodoId].filter(q => q.id !== id);
    }
    if (todosCache) {
      todosCache = todosCache.map(todo => {
        if (todo.id === numericTodoId) {
          return {
            ...todo,
            questions: (todo.questions || []).filter(q => q.id !== id)
          };
        }
        return todo;
      });
    }
    return { success: true };
  },
};

export const shareService = {
  getSharedCodes: async () => {
    const start = Date.now();
    console.time('Client Supabase: getSharedCodes');

    // Run cleanup call in the background asynchronously on client
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    supabase.from('shared_codes')
      .delete()
      .lt('created_at', fifteenMinutesAgo)
      .then(() => console.log('[Client cleanExpiredCodes] finished background cleanup'))
      .catch(err => console.error(err));

    const { data, error } = await supabase
      .from('shared_codes')
      .select('id, title, code, created_at')
      .order('created_at', { ascending: false });
    console.timeEnd('Client Supabase: getSharedCodes');
    logTiming('getSharedCodes', start);

    if (error) throw error;

    // Format created_at to YYYY-MM-DD HH:MM:SS format
    const formattedCodes = (data || []).map(item => {
      const d = new Date(item.created_at);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return {
        ...item,
        created_at: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
      };
    });

    return formattedCodes;
  },

  createSharedCode: async (title, code) => {
    const start = Date.now();
    console.time('Client Supabase: createSharedCode');
    const { data: newSnippet, error } = await supabase
      .from('shared_codes')
      .insert({ title: title.trim(), code: code })
      .select('id, title, code, created_at')
      .single();
    console.timeEnd('Client Supabase: createSharedCode');
    logTiming('createSharedCode', start);

    if (error) throw error;

    const d = new Date(newSnippet.created_at);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');

    return {
      ...newSnippet,
      created_at: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
    };
  },

  deleteSharedCode: async (id) => {
    const start = Date.now();
    console.time(`Client Supabase: deleteSharedCode ${id}`);
    const { error } = await supabase
      .from('shared_codes')
      .delete()
      .eq('id', id);
    console.timeEnd(`Client Supabase: deleteSharedCode ${id}`);
    logTiming(`deleteSharedCode ${id}`, start);

    if (error) throw error;
    return { success: true };
  },
};

export default supabase;
