# Trivy ignore policy — backstage específico.
# Herda a lógica de severidade da plataforma e adiciona CVEs sem fix disponível
# nas dependências do OS da imagem node:22-bookworm-slim.
#
# Referência: https://trivy.dev/latest/docs/configuration/filtering/#by-rego

package trivy

default ignore = false

ignore_severities := {"UNKNOWN", "LOW", "MEDIUM"}

# libtinfo6 / ncurses-base / ncurses-bin — affected, sem fix no Debian 12
ignore_cves := {
	"CVE-2025-69720",
	# perl-base — affected, sem fix no Debian 12
	"CVE-2026-42496",
	"CVE-2026-8376",
	"CVE-2026-42497",
	"CVE-2026-9538",
	# zlib1g — will_not_fix (decisão do Debian)
	"CVE-2023-45853",
	# perl-base/perl-IO-Compress — sem fix disponível
	"CVE-2026-48962",
}

ignore {
	input.Severity == ignore_severities[_]
}

ignore {
	input.VulnerabilityID == ignore_cves[_]
}
