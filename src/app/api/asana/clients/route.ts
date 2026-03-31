import { NextResponse } from 'next/server';

export async function GET() {
  const asanaToken = process.env.ASANA_ACCESS_TOKEN;
  const workspaceId = process.env.ASANA_WORKSPACE_ID;

  if (!asanaToken || !workspaceId) {
    return NextResponse.json({ error: 'Faltam credenciais do Asana no .env' }, { status: 401 });
  }

  try {
    // Busca todos os projetos no workspace (usando como 'Clientes')
    const response = await fetch(`https://app.asana.com/api/1.0/workspaces/${workspaceId}/projects`, {
      headers: {
        'Authorization': `Bearer ${asanaToken}`
      }
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar no Asana' }, { status: 500 });
  }
}
