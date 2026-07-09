import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', reqUserId)
    .maybeSingle();

  if (error || !user || !user.approved) {
    return null;
  }
  return user;
}

export async function GET(req) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    // 1. Total count of learning items using optimized count queries
    const [qCountRes, eCountRes, nCountRes] = await Promise.all([
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('code_examples').select('id', { count: 'exact', head: true }),
      supabase.from('notes').select('id', { count: 'exact', head: true })
    ]);

    const qCount = qCountRes.count || 0;
    const eCount = eCountRes.count || 0;
    const nCount = nCountRes.count || 0;
    const totalItems = qCount + eCount + nCount;

    // 2. Total completed items by user
    const completedRes = await supabase
      .from('user_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'Completed');

    const completedItems = completedRes.count || 0;

    // 3. Percentage
    const learningPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // 4. Completed topics count (todos is the topics table)
    const { data: todos, error: todosError } = await supabase.from('todos').select('id');
    if (todosError) throw todosError;

    const [allQuestions, allExamples, allNotes, userCompletedTasks] = await Promise.all([
      supabase.from('questions').select('id, todo_id'),
      supabase.from('code_examples').select('id, topic_id'),
      supabase.from('notes').select('id, topic_id'),
      supabase.from('user_tasks').select('item_type, item_id').eq('user_id', user.id).eq('status', 'Completed')
    ]);

    if (allQuestions.error) throw allQuestions.error;
    if (allExamples.error) throw allExamples.error;
    if (allNotes.error) throw allNotes.error;
    if (userCompletedTasks.error) throw userCompletedTasks.error;

    const completedQuestionIds = new Set(userCompletedTasks.data.filter(t => t.item_type === 'question').map(t => t.item_id));
    const completedExampleIds = new Set(userCompletedTasks.data.filter(t => t.item_type === 'code_example').map(t => t.item_id));
    const completedNoteIds = new Set(userCompletedTasks.data.filter(t => t.item_type === 'note').map(t => t.item_id));

    const topicQuestionsMap = {};
    allQuestions.data.forEach(q => {
      if (!topicQuestionsMap[q.todo_id]) topicQuestionsMap[q.todo_id] = [];
      topicQuestionsMap[q.todo_id].push(q.id);
    });

    const topicExamplesMap = {};
    allExamples.data.forEach(e => {
      if (!topicExamplesMap[e.topic_id]) topicExamplesMap[e.topic_id] = [];
      topicExamplesMap[e.topic_id].push(e.id);
    });

    const topicNotesMap = {};
    allNotes.data.forEach(n => {
      if (!topicNotesMap[n.topic_id]) topicNotesMap[n.topic_id] = [];
      topicNotesMap[n.topic_id].push(n.id);
    });

    let completedTopicsCount = 0;
    (todos || []).forEach(todo => {
      const qIds = topicQuestionsMap[todo.id] || [];
      const eIds = topicExamplesMap[todo.id] || [];
      const nIds = topicNotesMap[todo.id] || [];
      const total = qIds.length + eIds.length + nIds.length;

      if (total > 0) {
        const completedCount = 
          qIds.filter(id => completedQuestionIds.has(id)).length +
          eIds.filter(id => completedExampleIds.has(id)).length +
          nIds.filter(id => completedNoteIds.has(id)).length;
        
        if (completedCount === total) {
          completedTopicsCount++;
        }
      }
    });

    // 5. Weekly activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentTasks, error: recentError } = await supabase
      .from('user_tasks')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('status', 'Completed')
      .gte('completed_at', sevenDaysAgo.toISOString())
      .order('completed_at', { ascending: true });

    if (recentError) throw recentError;

    // Group by YYYY-MM-DD
    const activityMap = {};
    (recentTasks || []).forEach(t => {
      if (t.completed_at) {
        const dateStr = new Date(t.completed_at).toISOString().split('T')[0];
        activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
      }
    });

    const weeklyActivity = Object.entries(activityMap).map(([date, count]) => ({
      date,
      count
    }));

    // 6. Recommended learning tasks (suggest up to 3 questions not yet completed)
    const { data: completedQTasks, error: compQError } = await supabase
      .from('user_tasks')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_type', 'question')
      .eq('status', 'Completed');

    if (compQError) throw compQError;

    const completedQIds = (completedQTasks || []).map(t => t.item_id);

    let qQuery = supabase.from('questions').select('id, title, todo_id, difficulty');
    if (completedQIds.length > 0) {
      qQuery = qQuery.not('id', 'in', `(${completedQIds.join(',')})`);
    }
    const { data: questionsList, error: recsError } = await qQuery.limit(3);
    if (recsError) throw recsError;

    // Fetch todos to map recommended question topic titles
    const { data: todosList, error: todosListError } = await supabase.from('todos').select('id, title');
    if (todosListError) throw todosListError;

    const todoTitles = {};
    (todosList || []).forEach(t => { todoTitles[t.id] = t.title; });

    const recommendations = (questionsList || []).map(q => ({
      id: q.id,
      title: q.title,
      topic_id: q.todo_id,
      topic_title: todoTitles[q.todo_id] || 'General',
      difficulty: q.difficulty
    }));

    // 7. Streak verification (reset streak if broken)
    let currentStreak = user.streak;
    if (user.last_activity_date) {
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localToday = new Date(today.getTime() - (offset * 60 * 1000));
      const todayStr = localToday.toISOString().split('T')[0];

      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000 - (offset * 60 * 1000));
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const dbLastActivityStr = new Date(user.last_activity_date).toISOString().split('T')[0];

      if (dbLastActivityStr !== todayStr && dbLastActivityStr !== yesterdayStr) {
        currentStreak = 0;
        await supabase
          .from('users')
          .update({ streak: 0 })
          .eq('id', user.id);
      }
    }

    return NextResponse.json({
      streak: currentStreak,
      completedTasksCount: completedItems,
      completedTopicsCount: completedTopicsCount,
      totalTopicsCount: todos ? todos.length : 0,
      learningPercentage: learningPercentage,
      weeklyActivity: weeklyActivity,
      recommendations: recommendations
    });
  } catch (error) {
    console.error('GET user stats error:', error);
    return NextResponse.json({ message: 'Failed to retrieve stats.' }, { status: 500 });
  }
}
