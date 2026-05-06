export class HealthController {
  constructor(healthService) {
    this.healthService = healthService;
  }

  getHealth = async (req, res) => {
    try {
      const health = await this.healthService.checkHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ status: 'error', service: 'janus-backend', database: 'disconnected' });
    }
  };
}
