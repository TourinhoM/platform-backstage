# Trivy ignore policy — backstage específico.
# Herda a lógica de severidade da plataforma e adiciona CVEs sem fix disponível
# nas dependências do OS da imagem node:22-bookworm-slim.
#
# Referência: https://trivy.dev/latest/docs/configuration/filtering/#by-rego

package trivy

default ignore = false

ignore_severities := {"UNKNOWN", "LOW", "MEDIUM"}

# Pacotes do OS sem fix disponível no Debian 12 — ignorar pelo nome
# linux-libc-dev: kernel headers, 100+ CVEs affected/will_not_fix
# libpython3.11* / python3.11*: necessário para node-gyp, sem fix disponível
ignore_packages := {
	"linux-libc-dev",
	"libpython3.11-minimal",
	"libpython3.11-stdlib",
	"python3.11",
	"python3.11-minimal",
}

# CVEs específicos sem fix disponível no Debian 12
ignore_cves := {
	# libtinfo6 / ncurses — affected, sem fix
	"CVE-2025-69720",
	# perl-base — affected, sem fix
	"CVE-2026-42496",
	"CVE-2026-8376",
	"CVE-2026-42497",
	"CVE-2026-9538",
	"CVE-2026-48962",
	# zlib1g — will_not_fix (decisão do Debian)
	"CVE-2023-45853",
	# libexpat1 — will_not_fix / affected
	"CVE-2025-59375",
	"CVE-2026-25210",
	"CVE-2026-45186",
	# libsqlite3-0 — affected, sem fix
	"CVE-2025-7458",
}

ignore {
	input.Severity == ignore_severities[_]
}

ignore {
	input.VulnerabilityID == ignore_cves[_]
}

ignore {
	input.PkgName == ignore_packages[_]
}
