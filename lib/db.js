import { supabaseServer } from './supabase';
import { logger, NotFoundError, ValidationError } from './errors';

export const projects = {
  async create(userId, project) {
    try {
      const { data, error } = await supabaseServer
        .from('projects')
        .insert({
          user_id: userId,
          name: project.name,
          description: project.description,
          status: project.status || 'active',
          repository_url: project.repository_url,
          repository_owner: project.repository_owner,
          repository_name: project.repository_name,
          working_branch: project.working_branch || 'main',
          settings: project.settings || {},
        })
        .select('id, user_id, name, description, status, repository_url, repository_owner, repository_name, working_branch, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create project', error);
      throw error;
    }
  },

  async getById(projectId, userId) {
    try {
      const { data, error } = await supabaseServer
        .from('projects')
        .select('id, user_id, name, description, status, repository_url, repository_owner, repository_name, working_branch, created_at, updated_at')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (error) throw new NotFoundError('Project');
      return data;
    } catch (error) {
      logger.error('Failed to fetch project', error);
      throw error;
    }
  },

  async listByUser(userId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabaseServer
        .from('projects')
        .select('id, user_id, name, description, status, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to list projects', error);
      throw error;
    }
  },

  async update(projectId, userId, updates) {
    try {
      const { data, error } = await supabaseServer
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select('id, user_id, name, description, status, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to update project', error);
      throw error;
    }
  },

  async delete(projectId, userId) {
    try {
      const { error } = await supabaseServer
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to delete project', error);
      throw error;
    }
  },
};

export const chat = {
  async addMessage(projectId, message) {
    try {
      const { data, error } = await supabaseServer
        .from('chat_messages')
        .insert({
          project_id: projectId,
          role: message.role,
          content: message.content,
          tokens_used: message.tokens_used,
        })
        .select('id, project_id, role, content, tokens_used, created_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to add chat message', error);
      throw error;
    }
  },

  async getHistory(projectId, limit = 100) {
    try {
      const { data, error } = await supabaseServer
        .from('chat_messages')
        .select('id, project_id, role, content, tokens_used, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch chat history', error);
      throw error;
    }
  },

  async deleteHistory(projectId) {
    try {
      const { error } = await supabaseServer
        .from('chat_messages')
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to delete chat history', error);
      throw error;
    }
  },
};

export const deployments = {
  async create(deployment) {
    try {
      const { data, error } = await supabaseServer
        .from('deployments')
        .insert({
          project_id: deployment.project_id,
          type: deployment.type,
          status: deployment.status || 'pending',
          url: deployment.url,
          commit_sha: deployment.commit_sha,
          deploy_id: deployment.deploy_id,
          error_message: deployment.error_message,
        })
        .select('id, project_id, type, status, url, commit_sha, deploy_id, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create deployment record', error);
      throw error;
    }
  },

  async updateStatus(deploymentId, status, updates) {
    try {
      const { data, error } = await supabaseServer
        .from('deployments')
        .update({
          status,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deploymentId)
        .select('id, project_id, type, status, url, commit_sha, deploy_id, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to update deployment status', error);
      throw error;
    }
  },

  async getByProject(projectId, limit = 50) {
    try {
      const { data, error } = await supabaseServer
        .from('deployments')
        .select('id, project_id, type, status, url, commit_sha, deploy_id, created_at, updated_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch deployments', error);
      throw error;
    }
  },
};

export const metrics = {
  async getUserMetrics(userId) {
    try {
      const projectCount = await supabaseServer
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const generationCount = await supabaseServer
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user');

      const deploymentCount = await supabaseServer
        .from('deployments')
        .select('*', { count: 'exact', head: true });

      return {
        total_projects: projectCount?.count || 0,
        total_generations: generationCount?.count || 0,
        total_deployments: deploymentCount?.count || 0,
        last_active: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to fetch user metrics', error);
      throw error;
    }
  },
};

export const settings = {
  async saveUserPreferences(userId, preferences) {
    try {
      const { data, error } = await supabaseServer
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferences,
        })
        .select('user_id, preferences, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to save user preferences', error);
      throw error;
    }
  },

  async getUserPreferences(userId) {
    try {
      const { data, error } = await supabaseServer
        .from('user_preferences')
        .select('user_id, preferences')
        .eq('user_id', userId)
        .single();

      if (error) throw new NotFoundError('User preferences');
      return data?.preferences || {};
    } catch (error) {
      logger.error('Failed to fetch user preferences', error);
      throw error;
    }
  },
};

export const actions = {
  async create(projectId, userId, action) {
    try {
      const { data, error } = await supabaseServer
        .from('actions')
        .insert({
          project_id: projectId,
          user_id: userId,
          action_type: action.action_type,
          description: action.description,
          file_path: action.file_path,
          code_content: action.code_content,
          metadata: action.metadata || {},
        })
        .select('id, project_id, user_id, action_type, description, file_path, metadata, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create action', error);
      throw error;
    }
  },

  async getHistory(projectId, limit = 100) {
    try {
      const { data, error } = await supabaseServer
        .from('actions')
        .select('id, project_id, user_id, action_type, description, file_path, metadata, created_at, updated_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch action history', error);
      throw error;
    }
  },

  async getById(actionId) {
    try {
      const { data, error } = await supabaseServer
        .from('actions')
        .select('id, project_id, user_id, action_type, description, file_path, metadata, created_at, updated_at')
        .eq('id', actionId)
        .single();

      if (error) throw new NotFoundError('Action');
      return data;
    } catch (error) {
      logger.error('Failed to fetch action', error);
      throw error;
    }
  },
};

export const codeVersions = {
  async create(actionId, filePath, codeContent, language) {
    try {
      const { data, error } = await supabaseServer
        .from('code_versions')
        .insert({
          action_id: actionId,
          file_path: filePath,
          code_content: codeContent,
          language,
        })
        .select('id, action_id, file_path, language, created_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create code version', error);
      throw error;
    }
  },

  async getVersionHistory(filePath, limit = 50) {
    try {
      const { data, error } = await supabaseServer
        .from('code_versions')
        .select('id, action_id, file_path, language, created_at')
        .eq('file_path', filePath)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch code version history', error);
      throw error;
    }
  },

  async getByActionId(actionId) {
    try {
      const { data, error } = await supabaseServer
        .from('code_versions')
        .select('id, action_id, file_path, language, created_at')
        .eq('action_id', actionId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to fetch code versions for action', error);
      throw error;
    }
  },
};

export const historySnapshots = {
  async create(projectId, actionId, snapshotIndex, filesSnapshot) {
    try {
      const { data, error } = await supabaseServer
        .from('history_snapshots')
        .insert({
          project_id: projectId,
          action_id: actionId,
          snapshot_index: snapshotIndex,
          files_snapshot: filesSnapshot,
        })
        .select('id, project_id, action_id, snapshot_index, created_at')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to create history snapshot', error);
      throw error;
    }
  },

  async getLatest(projectId) {
    try {
      const { data, error } = await supabaseServer
        .from('history_snapshots')
        .select('id, project_id, action_id, snapshot_index, created_at')
        .eq('project_id', projectId)
        .order('snapshot_index', { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      logger.error('Failed to fetch latest snapshot', error);
      return null;
    }
  },

  async getByIndex(projectId, snapshotIndex) {
    try {
      const { data, error } = await supabaseServer
        .from('history_snapshots')
        .select('id, project_id, action_id, snapshot_index, created_at')
        .eq('project_id', projectId)
        .eq('snapshot_index', snapshotIndex)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      logger.error('Failed to fetch snapshot by index', error);
      return null;
    }
  },

  async listAll(projectId) {
    try {
      const { data, error } = await supabaseServer
        .from('history_snapshots')
        .select('id, action_id, snapshot_index, created_at')
        .eq('project_id', projectId)
        .order('snapshot_index', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to list snapshots', error);
      throw error;
    }
  },
};
