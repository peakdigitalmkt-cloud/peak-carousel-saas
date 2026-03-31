import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { action, payload } = await req.json();
  const token = payload?.token;
  
  if (!token) {
    return NextResponse.json({ error: 'Você precisa colocar o seu Token do Asana no Painel Principal.' }, { status: 401 });
  }

  const headers = { 'Authorization': `Bearer ${token}` };

  try {
    if (action === 'get_workspaces') {
      const res = await fetch('https://app.asana.com/api/1.0/workspaces', { headers });
      return NextResponse.json(await res.json());
    }
    
    if (action === 'get_projects' && payload.workspaceGid) {
      const res = await fetch(`https://app.asana.com/api/1.0/workspaces/${payload.workspaceGid}/projects`, { headers });
      return NextResponse.json(await res.json());
    }

    if (action === 'search_tasks' && payload.projectGid) {
      const res = await fetch(`https://app.asana.com/api/1.0/projects/${payload.projectGid}/tasks?opt_fields=name,notes,completed`, { headers });
      const data = await res.json();
      const carousels = data.data.filter((t: any) => !t.completed && t.name.toLowerCase().includes('carrossel'));
      return NextResponse.json({ data: carousels });
    }

    if (action === 'get_task' && payload.taskGid) {
      const res = await fetch(`https://app.asana.com/api/1.0/tasks/${payload.taskGid}?opt_fields=name,notes,completed`, { headers });
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Acão inválida' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro de servidor ao buscar Asana.' }, { status: 500 });
  }
}
